"""
Scoring engine: combines the pure rule functions from rules.py into two
independent sub-scores (Candidate Readiness, Territory Viability) plus one
overall Suitability Score. Returns a structured result shaped for direct
UI rendering — every factor that contributed carries its own name, which
sub-score it belongs to, points earned, and max points.
"""

from dataclasses import dataclass, field
from typing import List, Optional

from . import rules


@dataclass
class CandidateReadinessInputs:
    lead_heat_index_score: float  # 0-100, carried in from the Lead Heat Index step
    liquid_capital: float  # dollars
    distance_miles: float  # candidate's home to the assigned territory


@dataclass
class TerritoryViabilityInputs:
    meets_standard_minimum: bool
    competing_agency_count: int
    labor_market: str  # 'Loose' | 'Balanced' | 'Tight'
    moratorium_flagged: bool
    comparable_history_flagged: bool
    estimated_quartile: str  # 'Top' | 'Upper-Middle' | 'Lower-Middle' | 'Bottom'
    avg_star_rating: float  # competitor review sentiment, 0-5 scale


@dataclass
class ScoringInputs:
    candidate: CandidateReadinessInputs
    territory: TerritoryViabilityInputs


@dataclass
class Factor:
    name: str
    sub_score: str  # 'candidate_readiness' | 'territory_viability'
    points: float
    max_points: float


@dataclass
class SubScoreResult:
    score: float
    band: str
    factors: List[Factor]
    # Set only when a cap actually changed the result, so the UI can show
    # "would have scored N before the cap" instead of hiding the override.
    raw_score: Optional[float] = None
    capped_by: Optional[str] = None


@dataclass
class ScoringResult:
    overall_score: float
    overall_band: str
    candidate_readiness: SubScoreResult
    territory_viability: SubScoreResult
    factors: List[Factor] = field(default_factory=list)


def score_candidate_readiness(inputs: CandidateReadinessInputs) -> SubScoreResult:
    lead_heat_pct = rules.lead_heat_points(inputs.lead_heat_index_score)
    capital_pct = rules.capital_adequacy_points(inputs.liquid_capital)
    distance_pct = rules.distance_points(inputs.distance_miles)

    factors = [
        Factor(
            name="Lead Heat Index (carried in)",
            sub_score="candidate_readiness",
            points=round(lead_heat_pct * rules.LEAD_HEAT_WEIGHT, 1),
            max_points=rules.LEAD_HEAT_WEIGHT * 100,
        ),
        Factor(
            name="Capital adequacy vs. first-year cash need",
            sub_score="candidate_readiness",
            points=round(capital_pct * rules.CAPITAL_WEIGHT, 1),
            max_points=rules.CAPITAL_WEIGHT * 100,
        ),
        Factor(
            name="Distance from candidate's home to territory",
            sub_score="candidate_readiness",
            points=round(distance_pct * rules.DISTANCE_WEIGHT, 1),
            max_points=rules.DISTANCE_WEIGHT * 100,
        ),
    ]

    score = round(sum(f.points for f in factors), 1)
    return SubScoreResult(score=score, band=rules.band_for_score(score), factors=factors)


def score_territory_viability(inputs: TerritoryViabilityInputs) -> SubScoreResult:
    standard_pct = rules.standard_minimum_points(inputs.meets_standard_minimum)
    competitor_pct = rules.competitor_density_points(inputs.competing_agency_count)
    labor_pct = rules.labor_market_points(inputs.labor_market)
    moratorium_pct = rules.moratorium_points(inputs.moratorium_flagged)
    history_pct = rules.comparable_history_points(inputs.comparable_history_flagged)
    comparable_performance_pct = rules.comparable_performance_points(inputs.estimated_quartile)
    sentiment_pct = rules.competitor_sentiment_points(inputs.avg_star_rating)

    factors = [
        Factor(
            name="Meets standard population / age 65+ minimum",
            sub_score="territory_viability",
            points=round(standard_pct * rules.STANDARD_MINIMUM_WEIGHT, 1),
            max_points=rules.STANDARD_MINIMUM_WEIGHT * 100,
        ),
        Factor(
            name="Competitor density",
            sub_score="territory_viability",
            points=round(competitor_pct * rules.COMPETITOR_WEIGHT, 1),
            max_points=rules.COMPETITOR_WEIGHT * 100,
        ),
        Factor(
            name="Caregiver labor market tightness",
            sub_score="territory_viability",
            points=round(labor_pct * rules.LABOR_MARKET_WEIGHT, 1),
            max_points=rules.LABOR_MARKET_WEIGHT * 100,
        ),
        Factor(
            name="State licensure/moratorium status",
            sub_score="territory_viability",
            points=round(moratorium_pct * rules.MORATORIUM_WEIGHT, 1),
            max_points=rules.MORATORIUM_WEIGHT * 100,
        ),
        Factor(
            name="Comparable territory history match",
            sub_score="territory_viability",
            points=round(history_pct * rules.HISTORY_WEIGHT, 1),
            max_points=rules.HISTORY_WEIGHT * 100,
        ),
        Factor(
            name="Comparable territory performance (benchmarking)",
            sub_score="territory_viability",
            points=round(comparable_performance_pct * rules.COMPARABLE_PERFORMANCE_WEIGHT, 1),
            max_points=rules.COMPARABLE_PERFORMANCE_WEIGHT * 100,
        ),
        Factor(
            name="Competitor review sentiment",
            sub_score="territory_viability",
            points=round(sentiment_pct * rules.COMPETITOR_SENTIMENT_WEIGHT, 1),
            max_points=rules.COMPETITOR_SENTIMENT_WEIGHT * 100,
        ),
    ]

    raw_score = round(sum(f.points for f in factors), 1)
    score = raw_score
    capped_by: Optional[str] = None

    if inputs.moratorium_flagged and score > rules.MORATORIUM_CAP:
        score = rules.MORATORIUM_CAP
        capped_by = "moratorium"

    if inputs.comparable_history_flagged and score > rules.HISTORY_CAP:
        score = rules.HISTORY_CAP
        # Moratorium's cap (40) is always <= history's cap (50), so if
        # both are flagged the moratorium cap is already the binding one.
        if capped_by is None:
            capped_by = "comparable_history"

    return SubScoreResult(
        score=score,
        band=rules.band_for_score(score),
        factors=factors,
        raw_score=raw_score if capped_by else None,
        capped_by=capped_by,
    )


def score_deal(inputs: ScoringInputs) -> ScoringResult:
    candidate_result = score_candidate_readiness(inputs.candidate)
    territory_result = score_territory_viability(inputs.territory)

    # Simple average on purpose — don't overbuild the weighting between
    # the two sub-scores themselves.
    overall_score = round((candidate_result.score + territory_result.score) / 2, 1)

    return ScoringResult(
        overall_score=overall_score,
        overall_band=rules.band_for_score(overall_score),
        candidate_readiness=candidate_result,
        territory_viability=territory_result,
        factors=candidate_result.factors + territory_result.factors,
    )
