# Demo paths — hitting each Step 5 outcome on purpose

Five zip codes in `app/scoring/mockdata.py` (`DEMO_ZIPS`) are hardcoded —
not seed-generated — specifically so each, paired with the listed Step 1
field values, deterministically lands on one of the five outcome paths
Step 5 can show. Verified against the real engine
(`app/scoring/test_api.py::TestDemoZipScenarios`); numbers below are
exact, not approximate, and reflect Territory Viability's 7-factor
weighting (population/age minimum 25%, competitor density 20%, labor
market 15%, moratorium 15%, comparable history 5%, comparable-territory
performance 12%, competitor review sentiment 8%).

All five assume Step 1's other defaults unless a field is listed as
changed. Quick-select buttons for all five are available on Step 1.

## 1. High — zip `90210`

All Step 1 fields at their defaults (candidate "Jordan Alvarez", capital
$165,000, 11 days since inquiry, prior experience Yes, both Discovery Day
and FDD touchpoints checked, High engagement, "8 miles from assigned
zip").

**Result:** Candidate Readiness 74.1 (High), Territory Viability 86.6
(High — Upper-Middle comparable-performance quartile, 4.0★ competitor
sentiment), overall **80.3 — High**. Step 5 shows "Also worth
considering."

## 2. Medium, candidate-driven — zip `60614`

Change: liquid capital **$80,000**, days since inquiry **30**, engagement
**Medium**, distance **"90 miles from assigned zip"**.

**Result:** Candidate Readiness 29.3 (Low), Territory Viability 85.3
(High), overall **57.3 — Medium**, driven by the lower Candidate
Readiness score. Step 5 shows "Plan of action."

## 3. Medium, territory-driven — zip `30301`

All Step 1 fields at their defaults (same candidate as scenario 1).

**Result:** Candidate Readiness 74.1 (High), Territory Viability 42.2
(Medium — doesn't meet the standard population/age-65+ minimum, 8
competing agencies, Tight labor market, Bottom comparable-performance
quartile), overall **58.1 — Medium**, driven by the lower Territory
Viability score. Step 5 shows "Plan of action."

## 4. Low, candidate-driven — zip `77001`

Change: prior experience **No**, liquid capital **$5,000**, uncheck
**both** touchpoints, engagement **Low**, days since inquiry **30**,
distance **"150 miles from assigned zip"**.

**Result:** Candidate Readiness 2.8 (Low), Territory Viability 40.2
(Medium), overall **21.5 — Low**, driven by Candidate Readiness. Step 5
shows "Not ready to proceed on this pairing yet."

## 5. Low, territory-driven — zip `19101`

Change: liquid capital **$150,000**, uncheck the FDD touchpoint only
(leave Discovery Day checked), engagement **Medium**, days since inquiry
**30**, distance **"50 miles from assigned zip"**.

**Result:** Candidate Readiness 49.1 (Medium), Territory Viability 20.8
(Low — doesn't meet the standard minimum, 15 competing agencies, Tight
labor market, Pennsylvania licensure moratorium flagged, Bottom
comparable-performance quartile), overall **35.0 — Low**, driven by
Territory Viability. Step 5 shows "This territory may not be the right
fit."

This is the path that was previously unreachable through normal zip entry
before the competitor-count range widened from 3-7 to 2-15 and the
flag reachability widened beyond the 3 original anchor zips — and it
stayed reachable after the Territory Viability rebalance that added the
comparable-performance and competitor-sentiment factors.
