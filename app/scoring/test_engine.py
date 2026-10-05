"""
Unit tests for the scoring engine. Run with:
    python -m unittest app.scoring.test_engine -v
(from the project root, inside the venv once dependencies are installed —
this module only needs the standard library).
"""

import unittest

from . import rules
from .engine import (
    CandidateReadinessInputs,
    ScoringInputs,
    TerritoryViabilityInputs,
    score_deal,
)


class TestRuleBoundaries(unittest.TestCase):
    def test_band_thresholds(self):
        self.assertEqual(rules.band_for_score(70), "High")
        self.assertEqual(rules.band_for_score(69.9), "Medium")
        self.assertEqual(rules.band_for_score(40), "Medium")
        self.assertEqual(rules.band_for_score(39.9), "Low")

    def test_capital_adequacy_boundaries(self):
        self.assertEqual(rules.capital_adequacy_points(0), 0.0)
        self.assertEqual(rules.capital_adequacy_points(rules.FIRST_YEAR_CASH_MIN), 50.0)
        self.assertEqual(rules.capital_adequacy_points(rules.FIRST_YEAR_CASH_MAX), 100.0)
        self.assertEqual(rules.capital_adequacy_points(rules.FIRST_YEAR_CASH_MAX + 50_000), 100.0)
        # Midpoint of the min-max span should land at the midpoint of 50-100.
        midpoint_capital = (rules.FIRST_YEAR_CASH_MIN + rules.FIRST_YEAR_CASH_MAX) / 2
        self.assertAlmostEqual(rules.capital_adequacy_points(midpoint_capital), 75.0)

    def test_distance_boundaries(self):
        self.assertEqual(rules.distance_points(0), 100.0)
        comfortable_miles = rules.ASSUMED_AVG_DRIVE_MPH * rules.DRIVE_TIME_COMFORTABLE_HOURS
        self.assertEqual(rules.distance_points(comfortable_miles), 50.0)
        floor_miles = rules.ASSUMED_AVG_DRIVE_MPH * rules.DRIVE_TIME_FLOOR_HOURS
        self.assertEqual(rules.distance_points(floor_miles), 0.0)
        self.assertEqual(rules.distance_points(floor_miles + 100), 0.0)

    def test_labor_market_points(self):
        self.assertEqual(rules.labor_market_points("Loose"), 100.0)
        self.assertEqual(rules.labor_market_points("Balanced"), 50.0)
        self.assertEqual(rules.labor_market_points("Tight"), 0.0)

    def test_comparable_performance_points(self):
        self.assertEqual(rules.comparable_performance_points("Top"), 100.0)
        self.assertEqual(rules.comparable_performance_points("Upper-Middle"), 65.0)
        self.assertEqual(rules.comparable_performance_points("Lower-Middle"), 35.0)
        self.assertEqual(rules.comparable_performance_points("Bottom"), 10.0)

    def test_competitor_sentiment_points_direction(self):
        # Lower rating = more opportunity = higher points (inverse relationship).
        self.assertEqual(rules.competitor_sentiment_points(rules.SENTIMENT_RATING_FLOOR), 100.0)
        self.assertEqual(rules.competitor_sentiment_points(1.0), 100.0)  # below floor, still clamps to 100
        self.assertEqual(rules.competitor_sentiment_points(rules.SENTIMENT_RATING_CEILING), 0.0)
        self.assertEqual(rules.competitor_sentiment_points(5.0), 0.0)  # above ceiling, still clamps to 0
        midpoint = (rules.SENTIMENT_RATING_FLOOR + rules.SENTIMENT_RATING_CEILING) / 2
        self.assertAlmostEqual(rules.competitor_sentiment_points(midpoint), 50.0)


class TestScoringScenarios(unittest.TestCase):
    def test_clearly_high(self):
        inputs = ScoringInputs(
            candidate=CandidateReadinessInputs(
                lead_heat_index_score=90,
                liquid_capital=500_000,
                distance_miles=5,
            ),
            territory=TerritoryViabilityInputs(
                meets_standard_minimum=True,
                competing_agency_count=2,
                labor_market="Loose",
                moratorium_flagged=False,
                comparable_history_flagged=False,
                estimated_quartile="Top",
                avg_star_rating=2.5,
            ),
        )
        result = score_deal(inputs)

        self.assertEqual(result.candidate_readiness.band, "High")
        self.assertEqual(result.territory_viability.band, "High")
        self.assertEqual(result.overall_band, "High")
        self.assertGreaterEqual(result.overall_score, 70)
        self.assertIsNone(result.territory_viability.capped_by)

    def test_clearly_medium(self):
        inputs = ScoringInputs(
            candidate=CandidateReadinessInputs(
                lead_heat_index_score=55,
                liquid_capital=rules.FIRST_YEAR_CASH_MIN,
                distance_miles=rules.ASSUMED_AVG_DRIVE_MPH * rules.DRIVE_TIME_COMFORTABLE_HOURS,
            ),
            territory=TerritoryViabilityInputs(
                meets_standard_minimum=False,
                competing_agency_count=5,
                labor_market="Balanced",
                moratorium_flagged=False,
                comparable_history_flagged=False,
                estimated_quartile="Lower-Middle",
                avg_star_rating=3.5,
            ),
        )
        result = score_deal(inputs)

        self.assertEqual(result.overall_band, "Medium")
        self.assertGreaterEqual(result.overall_score, 40)
        self.assertLess(result.overall_score, 70)

    def test_clearly_low(self):
        inputs = ScoringInputs(
            candidate=CandidateReadinessInputs(
                lead_heat_index_score=20,
                liquid_capital=50_000,
                distance_miles=rules.ASSUMED_AVG_DRIVE_MPH * rules.DRIVE_TIME_FLOOR_HOURS,
            ),
            territory=TerritoryViabilityInputs(
                meets_standard_minimum=False,
                competing_agency_count=9,
                labor_market="Tight",
                moratorium_flagged=True,
                comparable_history_flagged=True,
                estimated_quartile="Bottom",
                avg_star_rating=4.8,
            ),
        )
        result = score_deal(inputs)

        self.assertEqual(result.candidate_readiness.band, "Low")
        self.assertEqual(result.territory_viability.band, "Low")
        self.assertEqual(result.overall_band, "Low")
        self.assertLess(result.overall_score, 40)

    def test_moratorium_caps_an_otherwise_high_territory_score(self):
        """
        A territory that would otherwise score High on every other factor
        must still be capped at 40 (Low) once a moratorium is flagged —
        this is the whole point of the cap, so it gets its own test
        instead of relying on a scenario where the cap happens to be moot.
        """
        inputs = TerritoryViabilityInputs(
            meets_standard_minimum=True,
            competing_agency_count=0,
            labor_market="Loose",
            moratorium_flagged=True,
            comparable_history_flagged=False,
            estimated_quartile="Top",
            avg_star_rating=2.5,
        )
        from .engine import score_territory_viability

        result = score_territory_viability(inputs)

        self.assertEqual(result.capped_by, "moratorium")
        self.assertEqual(result.score, rules.MORATORIUM_CAP)
        # The cap (40) sits exactly on the Medium/Low boundary, so this
        # lands in Medium, not Low — the cap limits the score, not the band.
        self.assertEqual(result.band, "Medium")
        self.assertIsNotNone(result.raw_score)
        self.assertGreater(result.raw_score, result.score)

    def test_factor_breakdown_shape_for_ui(self):
        inputs = ScoringInputs(
            candidate=CandidateReadinessInputs(
                lead_heat_index_score=70,
                liquid_capital=300_000,
                distance_miles=20,
            ),
            territory=TerritoryViabilityInputs(
                meets_standard_minimum=True,
                competing_agency_count=3,
                labor_market="Balanced",
                moratorium_flagged=False,
                comparable_history_flagged=False,
                estimated_quartile="Upper-Middle",
                avg_star_rating=3.5,
            ),
        )
        result = score_deal(inputs)

        self.assertEqual(len(result.factors), 10)  # 3 candidate + 7 territory
        for f in result.factors:
            self.assertIn(f.sub_score, ("candidate_readiness", "territory_viability"))
            self.assertGreaterEqual(f.points, 0)
            self.assertLessEqual(f.points, f.max_points)

        candidate_max = sum(f.max_points for f in result.factors if f.sub_score == "candidate_readiness")
        territory_max = sum(f.max_points for f in result.factors if f.sub_score == "territory_viability")
        self.assertAlmostEqual(candidate_max, 100)
        self.assertAlmostEqual(territory_max, 100)


if __name__ == "__main__":
    unittest.main()
