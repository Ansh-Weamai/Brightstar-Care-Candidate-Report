/**
 * Thin fetch wrapper around the two real backend endpoints
 * (POST /api/territory, POST /api/score). No scoring math or mock-data
 * generation lives here or anywhere else on the frontend — this module
 * only moves JSON back and forth.
 *
 * Both functions cache in-flight/completed requests by a cache key, so
 * repeated calls for the same zip or the same score inputs (e.g. visiting
 * a step again via Back/Next without changing anything) reuse the same
 * promise instead of re-hitting the network — and, since the server side
 * is itself deterministic per zip, this also guarantees the same zip
 * never produces different territory data across repeat visits.
 */

(function () {
  const territoryCache = new Map();
  const scoreCache = new Map();

  function fetchTerritory(zip) {
    const key = (zip || '').trim();
    if (territoryCache.has(key)) {
      return territoryCache.get(key);
    }

    const promise = fetch('/api/territory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zip: key }),
    }).then((res) => {
      if (!res.ok) {
        territoryCache.delete(key);
        throw new Error(`/api/territory failed (${res.status})`);
      }
      return res.json();
    }).catch((err) => {
      territoryCache.delete(key);
      throw err;
    });

    territoryCache.set(key, promise);
    return promise;
  }

  function fetchScore(payload) {
    const key = JSON.stringify(payload);
    if (scoreCache.has(key)) {
      return scoreCache.get(key);
    }

    const promise = fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) => {
      if (!res.ok) {
        scoreCache.delete(key);
        throw new Error(`/api/score failed (${res.status})`);
      }
      return res.json();
    }).catch((err) => {
      scoreCache.delete(key);
      throw err;
    });

    scoreCache.set(key, promise);
    return promise;
  }

  window.BrightStarApi = { fetchTerritory, fetchScore };
})();
