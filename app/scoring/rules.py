"""
Scoring rules: pure, stateless functions that turn one raw input into a
0-100 "points earned" value for a single factor. No weighting, no
aggregation, no I/O — that's the engine's job. Keeping the thresholds and
math here means a reviewer can audit every number the engine uses without
reading any orchestration code.
"""

# ---------------------------------------------------------------------------
# Candidate Readiness
# ---------------------------------------------------------------------------

LEAD_HEAT_WEIGHT = 0.50
CAPITAL_WEIGHT = 0.25
DISTANCE_WEIGHT = 0.25

# BrightStar's real first-year cash need range.
FIRST_YEAR_CASH_MIN = 235_000
FIRST_YEAR_CASH_MAX = 495_000

# Distance is converted to an assumed drive time using a flat average
# speed — a simplification, but distance is all Step 1 collects today.
ASSUMED_AVG_DRIVE_MPH = 45.0
DRIVE_TIME_COMFORTABLE_HOURS = 1.0  # the "1-hour-drive expectation" itself
DRIVE_TIME_FLOOR_HOURS = 2.0  # double the expectation — scores 0 from here


def lead_heat_points(lead_heat_index_score: float) -> float:
    """Carried in directly from the Lead Heat Index — already 0-100."""
    return max(0.0, min(100.0, lead_heat_index_score))


def capital_adequacy_points(liquid_capital: float) -> float:
    """
    50 at the low end of the real first-year cash need (minimally viable),
    scaling to 100 at the high end (fully funded even in the costlier
    case). Below the low end, scales down toward 0.
    """
    if liquid_capital >= FIRST_YEAR_CASH_MAX:
        return 100.0
    if liquid_capital >= FIRST_YEAR_CASH_MIN:
        span = FIRST_YEAR_CASH_MAX - FIRST_YEAR_CASH_MIN
        return 50.0 + 50.0 * (liquid_capital - FIRST_YEAR_CASH_MIN) / span
    if liquid_capital <= 0:
        return 0.0
    return max(0.0, 50.0 * liquid_capital / FIRST_YEAR_CASH_MIN)


def distance_points(distance_miles: float) -> float:
    """
    100 at zero distance, 50 exactly at the 1-hour-drive expectation,
    0 at double that (2 hours) or beyond.
    """
    drive_hours = max(0.0, distance_miles) / ASSUMED_AVG_DRIVE_MPH

    if drive_hours <= DRIVE_TIME_COMFORTABLE_HOURS:
        return 100.0 - 50.0 * (drive_hours / DRIVE_TIME_COMFORTABLE_HOURS)

    if drive_hours < DRIVE_TIME_FLOOR_HOURS:
        over = drive_hours - DRIVE_TIME_COMFORTABLE_HOURS
        span = DRIVE_TIME_FLOOR_HOURS - DRIVE_TIME_COMFORTABLE_HOURS
        return 50.0 - 50.0 * (over / span)

    return 0.0


# ---------------------------------------------------------------------------
# Territory Viability
# ---------------------------------------------------------------------------

# Rebalanced to make room for comparable-territory-performance and
# competitor-review-sentiment below — population/age minimum, competitor
# density, and labor market tightness still carry the most weight combined
# (0.60 of 1.00); the two new factors are real but not dominant (0.20
# combined). Moratorium's true influence comes mostly from its sub-score
# cap below, not its nominal weight, so it absorbed most of the reduction.
STANDARD_MINIMUM_WEIGHT = 0.25
COMPETITOR_WEIGHT = 0.20
LABOR_MARKET_WEIGHT = 0.15
MORATORIUM_WEIGHT = 0.15
HISTORY_WEIGHT = 0.05
COMPARABLE_PERFORMANCE_WEIGHT = 0.12
COMPETITOR_SENTIMENT_WEIGHT = 0.08

# Territory that only qualifies as Medium Density Market still gets half
# credit — it's a real, if lesser, market, not a failure.
MEDIUM_DENSITY_POINTS = 50.0

# Points lost per competing agency already in the territory.
COMPETITOR_PENALTY_PER_AGENCY = 10.0

LABOR_MARKET_POINTS = {
    "Loose": 100.0,
    "Balanced": 50.0,
    "Tight": 0.0,
}

# These caps apply to the overall Territory Viability sub-score, on top
# of (not instead of) this factor's own weighted contribution.
MORATORIUM_CAP = 40.0
HISTORY_CAP = 50.0

# Comparable Territory Performance — directional quartile estimate (from
# mockdata.py) mapped to points. Not a guarantee, so even "Bottom" still
# earns some credit rather than zeroing the factor outright.
QUARTILE_POINTS = {
    "Top": 100.0,
    "Upper-Middle": 65.0,
    "Lower-Middle": 35.0,
    "Bottom": 10.0,
}

# Competitor Review Sentiment — framed as a market-opportunity signal:
# weaker competitor ratings mean more room to win share, so a LOWER
# average rating scores HIGHER here, not lower.
SENTIMENT_RATING_FLOOR = 2.5  # at/below this: maximum opportunity (100 pts)
SENTIMENT_RATING_CEILING = 4.8  # at/above this: minimal opportunity (0 pts)


def standard_minimum_points(meets_standard_minimum: bool) -> float:
    return 100.0 if meets_standard_minimum else MEDIUM_DENSITY_POINTS


def competitor_density_points(competing_agency_count: int) -> float:
    return max(0.0, 100.0 - competing_agency_count * COMPETITOR_PENALTY_PER_AGENCY)


def labor_market_points(labor_market: str) -> float:
    return LABOR_MARKET_POINTS.get(labor_market, 50.0)


def comparable_performance_points(estimated_quartile: str) -> float:
    return QUARTILE_POINTS.get(estimated_quartile, 35.0)


def competitor_sentiment_points(avg_star_rating: float) -> float:
    if avg_star_rating <= SENTIMENT_RATING_FLOOR:
        return 100.0
    if avg_star_rating >= SENTIMENT_RATING_CEILING:
        return 0.0
    span = SENTIMENT_RATING_CEILING - SENTIMENT_RATING_FLOOR
    return 100.0 * (SENTIMENT_RATING_CEILING - avg_star_rating) / span


def moratorium_points(moratorium_flagged: bool) -> float:
    return 0.0 if moratorium_flagged else 100.0


def comparable_history_points(comparable_history_flagged: bool) -> float:
    return 0.0 if comparable_history_flagged else 100.0


# ---------------------------------------------------------------------------
# Shared banding
# ---------------------------------------------------------------------------

BAND_HIGH_MIN = 70.0
BAND_MEDIUM_MIN = 40.0


def band_for_score(score: float) -> str:
    if score >= BAND_HIGH_MIN:
        return "High"
    if score >= BAND_MEDIUM_MIN:
        return "Medium"
    return "Low"
