"""
The ONE place zip-seeded mock GbBis territory data is generated.

Nothing else in this codebase — frontend or backend — should invent
population/competitor/labor-market/flag numbers for a zip. Everything
routes through get_territory_read() below, which the /api/territory
endpoint calls directly.

Determinism: every number is derived from a seed built from the zip
string (plus a purpose suffix, so different numbers for the same zip
don't accidentally correlate). The same zip always produces the same
read — nothing here is re-rolled between requests.
"""

import hashlib
import random

POPULATION_MIN = 195_000
POPULATION_MAX = 305_000
AGE_65_MIN = 12_000
AGE_65_MAX = 23_000
DISTANCE_MIN = 0.4
DISTANCE_MAX = 2.8

STANDARD_POPULATION_MIN = 200_000
STANDARD_POPULATION_MAX = 300_000
STANDARD_AGE_65_MIN = 15_000

# Widened from the original 3-7 so a bad territory can actually lose the
# full competitor-density factor (rules.py already zeroes it at count>=10 —
# see competitor_density_points) instead of only ever being nudged.
COMPETITOR_COUNT_MIN = 2
COMPETITOR_COUNT_MAX = 15

LABOR_MARKETS = ("Loose", "Balanced", "Tight")

CADENCE = "Last measured Apr 2026 · next re-measurement Oct 2026"

# --- Comparable Territory Performance (BrightStar's benchmarking dashboard) ---
# These three reference figures are fixed — they describe the comparable-
# territory population as a whole, not this specific zip.
BENCHMARK_MEDIAN_REVENUE = 1_940_000
BENCHMARK_TOP_QUARTILE_REVENUE = 4_770_000
BENCHMARK_BOTTOM_QUARTILE_REVENUE = 853_000

QUARTILE_LABELS = ("Bottom", "Lower-Middle", "Upper-Middle", "Top")

# --- Competitor Review Sentiment ---
STAR_RATING_MIN = 2.5
STAR_RATING_MAX = 4.8
REVIEW_VOLUME_MIN = 15
REVIEW_VOLUME_MAX = 220

NO_FLAG_NOTE = {
    "label": "No flags",
    "text": "No moratorium or historical pattern flagged.",
    "flagged": False,
    "type": "none",
}

# Guaranteed anchors — always flagged regardless of their seeded roll, so
# existing demo behavior never regresses.
ANCHOR_ZIP_NOTES = {
    "53202": {
        "label": "Wisconsin reacquisition note",
        "text": "This territory was previously reacquired from a prior franchisee. Confirm current ownership history before proceeding.",
        "flagged": True,
        "type": "history",
    },
    "90001": {
        "label": "California non-renewal note",
        "text": "A prior franchise agreement in this territory was not renewed. Review the file before advancing this candidate.",
        "flagged": True,
        "type": "history",
    },
    "10001": {
        "label": "New York licensure moratorium",
        "text": "New York State has an active licensure moratorium affecting new home care agency approvals in this area.",
        "flagged": True,
        "type": "moratorium",
    },
}

# Below this roll (0-1, seeded per zip): a history-type flag.
# Between this and HISTORY_ROLL_CEILING: a moratorium-type flag.
# Above that: no flag. ~10% history, ~8% moratorium, ~82% clean, for any
# zip not already covered by ANCHOR_ZIP_NOTES or DEMO_ZIPS below.
HISTORY_ROLL_CEILING = 0.10
MORATORIUM_ROLL_CEILING = 0.18


def _seed_from(key: str) -> int:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return int(digest, 16)


def _rng_for(zip_code: str, purpose: str) -> random.Random:
    return random.Random(_seed_from(f"{zip_code}:{purpose}"))


def _generic_note(zip_code: str) -> dict:
    """Seed-based flag roll for any zip without a hardcoded override."""
    roll = _rng_for(zip_code, "flag-roll").random()

    if roll < HISTORY_ROLL_CEILING:
        return {
            "label": f"Comparable territory history ({zip_code})",
            "text": "A prior franchise agreement in a comparable territory was not renewed, or was reacquired from a prior franchisee. Review the file before advancing this candidate.",
            "flagged": True,
            "type": "history",
        }

    if roll < MORATORIUM_ROLL_CEILING:
        return {
            "label": f"State licensure/moratorium flag ({zip_code})",
            "text": "This state currently has an active licensure moratorium affecting new home care agency approvals.",
            "flagged": True,
            "type": "moratorium",
        }

    return NO_FLAG_NOTE


# ---------------------------------------------------------------------------
# Demo zips — fully hardcoded (not seed-generated) so the five Step 5
# outcome paths are exact and reproducible on demand. See docs/demo-paths.md
# for which Step 1 candidate defaults pair with each to hit that outcome.
# ---------------------------------------------------------------------------

DEMO_ZIPS = {
    "90210": {  # -> High
        "population": 250_000,
        "age_65_plus": 18_000,
        "distance_to_nearest_agency": 1.0,
        "competing_agency_count": 2,
        "labor_market": "Loose",
        "note": NO_FLAG_NOTE,
        "avg_star_rating": 4.0,
        "review_volume": 120,
    },
    "60614": {  # -> Medium, candidate-driven
        "population": 240_000,
        "age_65_plus": 17_000,
        "distance_to_nearest_agency": 1.2,
        "competing_agency_count": 3,
        "labor_market": "Loose",
        "note": NO_FLAG_NOTE,
        "avg_star_rating": 3.8,
        "review_volume": 95,
    },
    "30301": {  # -> Medium, territory-driven
        "population": 180_000,
        "age_65_plus": 10_000,
        "distance_to_nearest_agency": 2.0,
        "competing_agency_count": 8,
        "labor_market": "Tight",
        "note": NO_FLAG_NOTE,
        "avg_star_rating": 3.5,
        "review_volume": 60,
    },
    "77001": {  # -> Low, candidate-driven
        "population": 180_000,
        "age_65_plus": 10_000,
        "distance_to_nearest_agency": 2.5,
        "competing_agency_count": 9,
        "labor_market": "Tight",
        "note": NO_FLAG_NOTE,
        "avg_star_rating": 3.5,
        "review_volume": 55,
    },
    "19101": {  # -> Low, territory-driven
        "population": 150_000,
        "age_65_plus": 9_000,
        "distance_to_nearest_agency": 2.7,
        "competing_agency_count": 15,
        "labor_market": "Tight",
        "note": {
            "label": "Pennsylvania licensure moratorium",
            "text": "Pennsylvania currently has an active licensure moratorium affecting new home care agency approvals in this area.",
            "flagged": True,
            "type": "moratorium",
        },
        "avg_star_rating": 4.2,
        "review_volume": 70,
    },
}


def _meets_standard(population: int, age_65_plus: int) -> bool:
    return (
        STANDARD_POPULATION_MIN <= population <= STANDARD_POPULATION_MAX
        and age_65_plus >= STANDARD_AGE_65_MIN
    )


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _estimate_quartile(population: int, age_65_plus: int, competing_agency_count: int) -> str:
    """
    Directional only — a composite of this territory's own already-known
    demographic/competitive metrics (not a new independent roll), so the
    estimate is internally consistent with the rest of the territory read
    rather than an arbitrary coincidence.
    """
    population_component = _clamp01((population - POPULATION_MIN) / (POPULATION_MAX - POPULATION_MIN))
    age_component = _clamp01((age_65_plus - AGE_65_MIN) / (AGE_65_MAX - AGE_65_MIN))
    competitor_component = _clamp01(
        1 - (competing_agency_count - COMPETITOR_COUNT_MIN) / (COMPETITOR_COUNT_MAX - COMPETITOR_COUNT_MIN)
    )

    composite = population_component * 0.4 + age_component * 0.4 + competitor_component * 0.2

    if composite >= 0.75:
        return "Top"
    if composite >= 0.50:
        return "Upper-Middle"
    if composite >= 0.25:
        return "Lower-Middle"
    return "Bottom"


def _comparable_performance(population: int, age_65_plus: int, competing_agency_count: int) -> dict:
    return {
        "median_revenue": BENCHMARK_MEDIAN_REVENUE,
        "top_quartile_revenue": BENCHMARK_TOP_QUARTILE_REVENUE,
        "bottom_quartile_revenue": BENCHMARK_BOTTOM_QUARTILE_REVENUE,
        "estimated_quartile": _estimate_quartile(population, age_65_plus, competing_agency_count),
    }


def _competitor_sentiment_for_seed(seed_key: str) -> dict:
    rng = _rng_for(seed_key, "sentiment")
    avg_star_rating = round(rng.uniform(STAR_RATING_MIN, STAR_RATING_MAX), 1)
    review_volume = round(rng.uniform(REVIEW_VOLUME_MIN, REVIEW_VOLUME_MAX))
    return {"avg_star_rating": avg_star_rating, "review_volume": review_volume}


def get_territory_read(zip_code: str) -> dict:
    """The full GbBis mock read for one zip. Deterministic, never re-rolled."""
    zip_code = (zip_code or "").strip()

    if zip_code in DEMO_ZIPS:
        fixed = DEMO_ZIPS[zip_code]
        return {
            "zip": zip_code,
            "population": fixed["population"],
            "age_65_plus": fixed["age_65_plus"],
            "distance_to_nearest_agency": fixed["distance_to_nearest_agency"],
            "meets_standard_minimum": _meets_standard(fixed["population"], fixed["age_65_plus"]),
            "competing_agency_count": fixed["competing_agency_count"],
            "labor_market": fixed["labor_market"],
            "note": fixed["note"],
            "cadence": CADENCE,
            "comparable_performance": _comparable_performance(
                fixed["population"], fixed["age_65_plus"], fixed["competing_agency_count"]
            ),
            "competitor_sentiment": {
                "avg_star_rating": fixed["avg_star_rating"],
                "review_volume": fixed["review_volume"],
            },
        }

    seed_key = zip_code or "00000"
    metrics_rng = _rng_for(seed_key, "metrics")
    population = round(metrics_rng.uniform(POPULATION_MIN, POPULATION_MAX))
    age_65_plus = round(metrics_rng.uniform(AGE_65_MIN, AGE_65_MAX))
    distance_to_nearest_agency = round(metrics_rng.uniform(DISTANCE_MIN, DISTANCE_MAX), 1)

    competing_agency_count = round(
        _rng_for(seed_key, "competing").uniform(COMPETITOR_COUNT_MIN, COMPETITOR_COUNT_MAX)
    )
    labor_market = _rng_for(seed_key, "labor").choice(LABOR_MARKETS)

    note = ANCHOR_ZIP_NOTES.get(zip_code) or _generic_note(seed_key)

    return {
        "zip": zip_code,
        "population": population,
        "age_65_plus": age_65_plus,
        "distance_to_nearest_agency": distance_to_nearest_agency,
        "meets_standard_minimum": _meets_standard(population, age_65_plus),
        "competing_agency_count": competing_agency_count,
        "labor_market": labor_market,
        "note": note,
        "cadence": CADENCE,
        "comparable_performance": _comparable_performance(population, age_65_plus, competing_agency_count),
        "competitor_sentiment": _competitor_sentiment_for_seed(seed_key),
    }
