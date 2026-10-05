"""
Integration tests that hit /api/territory and /api/score through FastAPI's
TestClient — the full HTTP request/response/serialization stack, not a
direct in-process call into engine.py/rules.py (that's what
test_engine.py is for).

Run with:
    python -m unittest app.scoring.test_api -v
"""

import unittest

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def territory_inputs_from_response(territory_json):
    note = territory_json["note"]
    return {
        "meetsStandardMinimum": territory_json["meetsStandardMinimum"],
        "competingAgencyCount": territory_json["competingAgencyCount"],
        "laborMarket": territory_json["laborMarket"],
        "moratoriumFlagged": note["type"] == "moratorium",
        "comparableHistoryFlagged": note["type"] == "history",
        "estimatedQuartile": territory_json["comparablePerformance"]["estimatedQuartile"],
        "avgStarRating": territory_json["competitorSentiment"]["avgStarRating"],
    }


def score_for(zip_code, candidate):
    territory_resp = client.post("/api/territory", json={"zip": zip_code})
    assert territory_resp.status_code == 200, territory_resp.text
    territory_json = territory_resp.json()

    score_resp = client.post(
        "/api/score",
        json={"candidate": candidate, "territory": territory_inputs_from_response(territory_json)},
    )
    assert score_resp.status_code == 200, score_resp.text
    return score_resp.json(), territory_json


class TestTerritoryEndpoint(unittest.TestCase):
    def test_returns_expected_shape(self):
        resp = client.post("/api/territory", json={"zip": "78701"})
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        for key in (
            "zip", "population", "age65Plus", "distanceToNearestAgency",
            "meetsStandardMinimum", "competingAgencyCount", "laborMarket", "note", "cadence",
            "comparablePerformance", "competitorSentiment",
        ):
            self.assertIn(key, body)
        self.assertEqual(body["zip"], "78701")

    def test_same_zip_is_deterministic_across_requests(self):
        first = client.post("/api/territory", json={"zip": "41414"}).json()
        second = client.post("/api/territory", json={"zip": "41414"}).json()
        self.assertEqual(first, second)

    def test_anchor_zip_moratorium_still_flagged(self):
        body = client.post("/api/territory", json={"zip": "10001"}).json()
        self.assertTrue(body["note"]["flagged"])
        self.assertEqual(body["note"]["type"], "moratorium")

    def test_missing_zip_is_rejected(self):
        resp = client.post("/api/territory", json={"zip": "  "})
        self.assertEqual(resp.status_code, 422)


class TestScoreEndpoint(unittest.TestCase):
    def test_returns_expected_shape(self):
        resp = client.post(
            "/api/score",
            json={
                "candidate": {"leadHeatIndexScore": 85, "liquidCapital": 165000, "distanceMiles": 8},
                "territory": {
                    "meetsStandardMinimum": True,
                    "competingAgencyCount": 3,
                    "laborMarket": "Loose",
                    "moratoriumFlagged": False,
                    "comparableHistoryFlagged": False,
                    "estimatedQuartile": "Upper-Middle",
                    "avgStarRating": 3.5,
                },
            },
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertIn("overallScore", body)
        self.assertIn("overallBand", body)
        self.assertIn("candidateReadiness", body)
        self.assertIn("territoryViability", body)
        self.assertEqual(len(body["factors"]), 10)
        self.assertEqual(body["overallBand"], "High")


class TestDemoZipScenarios(unittest.TestCase):
    """
    Locks in that all 5 Step 5 outcome paths are reachable through the
    real HTTP endpoints — in particular, that Territory Viability can
    now actually be the dominant (lower) sub-score in a Low result,
    which was not reachable before mockdata.py's ranges widened.
    """

    def test_high(self):
        result, _ = score_for(
            "90210",
            {"leadHeatIndexScore": 85, "liquidCapital": 165000, "distanceMiles": 8},
        )
        self.assertEqual(result["overallBand"], "High")

    def test_medium_candidate_driven(self):
        result, _ = score_for(
            "60614",
            {"leadHeatIndexScore": 50, "liquidCapital": 80000, "distanceMiles": 90},
        )
        self.assertEqual(result["overallBand"], "Medium")
        self.assertLess(result["candidateReadiness"]["score"], result["territoryViability"]["score"])

    def test_medium_territory_driven(self):
        result, _ = score_for(
            "30301",
            {"leadHeatIndexScore": 85, "liquidCapital": 165000, "distanceMiles": 8},
        )
        self.assertEqual(result["overallBand"], "Medium")
        self.assertLess(result["territoryViability"]["score"], result["candidateReadiness"]["score"])

    def test_low_candidate_driven(self):
        result, _ = score_for(
            "77001",
            {"leadHeatIndexScore": 5, "liquidCapital": 5000, "distanceMiles": 150},
        )
        self.assertEqual(result["overallBand"], "Low")
        self.assertLess(result["candidateReadiness"]["score"], result["territoryViability"]["score"])

    def test_low_territory_driven(self):
        """The previously-unreachable path — Territory Viability as the
        dominant driver of a genuine Low overall result."""
        result, territory = score_for(
            "19101",
            {"leadHeatIndexScore": 60, "liquidCapital": 150000, "distanceMiles": 50},
        )
        self.assertEqual(result["overallBand"], "Low")
        self.assertLess(result["territoryViability"]["score"], result["candidateReadiness"]["score"])
        self.assertTrue(territory["note"]["flagged"])
        self.assertEqual(territory["note"]["type"], "moratorium")


if __name__ == "__main__":
    unittest.main()
