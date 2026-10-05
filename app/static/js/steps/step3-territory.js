/**
 * Step 3 — Territory Read, keyed off Step 1's zip code.
 *
 * Read-only. All territory data now comes from POST /api/territory (see
 * app/scoring/mockdata.py) — nothing is computed client-side. Rebuilt via
 * onEnter every time the step becomes visible, so editing the zip back in
 * Step 1 and returning here fetches the new zip's read. The API client's
 * own per-zip cache (lib/api-client.js) means repeat visits to the same
 * zip don't re-hit the network and — since the server is itself
 * deterministic per zip — never produce different data either.
 */

(function () {
  function renderLoading(root) {
    root.innerHTML = `
      <div class="gb-embed">
        <div class="gb-embed__header">
          <span class="gb-badge">From GbBis</span>
        </div>
        <p class="gb-loading">Loading territory read…</p>
      </div>
    `;
  }

  function renderError(root, state, message) {
    root.innerHTML = `
      <div class="gb-embed">
        <div class="gb-embed__header">
          <span class="gb-badge">From GbBis</span>
        </div>
        <div class="gb-error">
          <strong>Couldn't load the territory read.</strong>
          <span>${message}</span>
          <button type="button" class="gb-error__retry">Retry</button>
        </div>
      </div>
    `;
    root.querySelector('.gb-error__retry').addEventListener('click', () => renderTerritoryRead(root, state));
  }

  function renderTerritoryRead(root, state) {
    renderLoading(root);
    const zip = (state.territoryZip || '').trim();

    window.BrightStarApi.fetchTerritory(zip)
      .then((r) => {
        const qualBg = r.meetsStandardMinimum ? '#eaf6ea' : '#fdf2e3';
        const qualText = r.meetsStandardMinimum ? '#3c763d' : '#8a6116';
        const qualLabel = r.meetsStandardMinimum
          ? 'Meets standard-territory minimum'
          : 'Medium Density Market only';

        const flagBg = r.note.flagged ? '#fbeceb' : '#f5f5f5';
        const flagBorder = r.note.flagged ? '#d9534f' : '#ccc';
        const flagTextColor = r.note.flagged ? '#a94442' : '#666';

        root.innerHTML = `
          <div class="gb-embed">
            <div class="gb-embed__header">
              <span class="gb-badge">From GbBis</span>
            </div>
            <h3 class="gb-embed__title">Territory Read: Zip ${r.zip || 'N/A'}</h3>

            <div class="gb-metrics">
              <div class="gb-metric">
                <span class="gb-metric__label">Population within assigned zips</span>
                <span class="gb-metric__value">${r.population.toLocaleString()}</span>
              </div>
              <div class="gb-metric">
                <span class="gb-metric__label">Population age 65+</span>
                <span class="gb-metric__value">${r.age65Plus.toLocaleString()}</span>
              </div>
              <div class="gb-metric">
                <span class="gb-metric__label">Distance to nearest existing BrightStar agency</span>
                <span class="gb-metric__value">${r.distanceToNearestAgency} miles</span>
              </div>
            </div>

            <div class="gb-qualification" style="background:${qualBg}; color:${qualText};">${qualLabel}</div>
            <p class="gb-note">Standard-territory minimum: 200k–300k population and 15k+ age 65+. No buffer radius is required for this check.</p>

            <div class="gb-flag" style="background:${flagBg}; border-left-color:${flagBorder}; color:${flagTextColor};">
              <strong>${r.note.label}</strong>
              <span>${r.note.text}</span>
            </div>

            <p class="gb-cadence">${r.cadence}</p>
          </div>
        `;
      })
      .catch((err) => {
        renderError(root, state, err.message || 'Unknown error.');
      });
  }

  function buildStep3Territory(state) {
    const root = document.createElement('div');
    root.className = 'step3-territory';
    const refresh = () => renderTerritoryRead(root, state);
    refresh();
    return { element: root, refresh };
  }

  window.buildStep3Territory = buildStep3Territory;
})();
