/**
 * Shared sequence for "fetch this zip's territory read, then score the
 * deal" — used by both Step 4 (which kicks this off as the fusion moment)
 * and Step 5 (which needs the same result and, thanks to api-client.js's
 * caching, gets it instantly if Step 4 already resolved it).
 *
 * Lead Heat Index itself stays client-side — it's explicitly a mock of
 * FranConnect's own existing read-out (Step 2), not part of the
 * territory/scoring business logic this task centralized server-side.
 */

(function () {
  function parseDistanceMiles(text) {
    const match = /(\d+(\.\d+)?)/.exec(text || '');
    return match ? parseFloat(match[1]) : 0;
  }

  function buildScoringPayload(state, territoryRead) {
    const leadHeat = window.computeLeadHeatIndex(state);
    return {
      candidate: {
        leadHeatIndexScore: leadHeat.score,
        liquidCapital: state.liquidCapital,
        distanceMiles: parseDistanceMiles(state.distanceFromTerritory),
      },
      territory: {
        meetsStandardMinimum: territoryRead.meetsStandardMinimum,
        competingAgencyCount: territoryRead.competingAgencyCount,
        laborMarket: territoryRead.laborMarket,
        moratoriumFlagged: territoryRead.note.type === 'moratorium',
        comparableHistoryFlagged: territoryRead.note.type === 'history',
        estimatedQuartile: territoryRead.comparablePerformance.estimatedQuartile,
        avgStarRating: territoryRead.competitorSentiment.avgStarRating,
      },
    };
  }

  function getScoreForState(state) {
    const zip = (state.territoryZip || '').trim();
    return window.BrightStarApi.fetchTerritory(zip).then((territoryRead) => {
      const payload = buildScoringPayload(state, territoryRead);
      return window.BrightStarApi.fetchScore(payload).then((result) => ({
        result,
        territoryRead,
        payload,
      }));
    });
  }

  window.buildScoringPayload = buildScoringPayload;
  window.getScoreForState = getScoreForState;
})();
