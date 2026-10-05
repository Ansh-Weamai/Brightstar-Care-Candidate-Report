/**
 * Step 4 — Convergence: Lead Heat Index (Step 2) + GbBis Territory Read
 * (Step 3) + BrightStar's own benchmarking dashboard + signals neither
 * tool tracks, all flowing into one Scoring Engine node. This is also
 * where the real /api/score call actually fires — the fusion animation's
 * loading phase is what the visitor sees while that request is in
 * flight. No scoring math lives here; this only displays what the
 * territory fetch and the score fetch return.
 */

(function () {
  const EXPLAIN = {
    leadHeat: "FranConnect's own engagement score. Blends prior experience, capital, touchpoints, and engagement level into one 0-100 read.",
    territory: 'GbBis’ population and age-65+ check against BrightStar’s standard-territory thresholds.',
    benchmark: 'Directional only: which revenue quartile this territory’s population, age-65+, and competitor density most resemble, based on comparable BrightStar territories.',
    competingAgencies: 'Home-care agencies already operating in this territory, from GbBis. More competitors can mean a harder market to break into.',
    laborMarket: 'How hard it is to hire caregivers locally. A Tight market makes staffing up slower and more expensive.',
    moratorium: 'Whether this state currently restricts new home-care agency licenses. A flagged moratorium caps the territory score regardless of its other strengths.',
    history: 'Whether a comparable or nearby territory has a reacquisition or non-renewal on file. A pattern worth reviewing before advancing.',
    sentiment: 'Average public rating of competing agencies in this territory. Weaker ratings can mean more room to win share, not just more competition.',
  };

  let infoClickOutsideBound = false;

  function infoIcon(key) {
    const text = EXPLAIN[key] || '';
    return `
      <span class="info-affordance">
        <button type="button" class="info-affordance__trigger" aria-label="What does this mean?" aria-expanded="false">i</button>
        <span class="info-affordance__tooltip" role="tooltip">${text}</span>
      </span>
    `;
  }

  function bindInfoAffordances(root) {
    root.querySelectorAll('.info-affordance__trigger').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrap = btn.closest('.info-affordance');
        const willOpen = !wrap.classList.contains('is-open');
        root.querySelectorAll('.info-affordance.is-open').forEach((other) => {
          other.classList.remove('is-open');
          other.querySelector('.info-affordance__trigger').setAttribute('aria-expanded', 'false');
        });
        if (willOpen) {
          wrap.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    if (!infoClickOutsideBound) {
      document.addEventListener('click', (e) => {
        if (e.target.closest('.info-affordance')) return;
        document.querySelectorAll('.info-affordance.is-open').forEach((wrap) => {
          wrap.classList.remove('is-open');
          wrap.querySelector('.info-affordance__trigger').setAttribute('aria-expanded', 'false');
        });
      });
      infoClickOutsideBound = true;
    }
  }

  function renderLoading(root) {
    root.innerHTML = `
      <div class="step4-converge is-ready">
        <div class="step4-engine step4-engine--loading">
          <span class="step4-engine__label">Scoring Engine</span>
          <span class="step4-engine__sublabel">Computing…</span>
        </div>
      </div>
    `;
  }

  function renderError(root, state, message) {
    root.innerHTML = `
      <div class="step4-converge is-ready">
        <div class="step4-error">
          <strong>Couldn't reach the scoring engine.</strong>
          <span>${message}</span>
          <button type="button" class="step4-error__retry">Retry</button>
        </div>
      </div>
    `;
    root.querySelector('.step4-error__retry').addEventListener('click', () => renderConvergence(root, state));
  }

  function formatRevenue(n) {
    if (n >= 1_000_000) {
      return `$${(n / 1_000_000).toFixed(2)}M`;
    }
    return `$${Math.round(n / 1000)}K`;
  }

  function renderConvergence(root, state) {
    renderLoading(root);

    window.getScoreForState(state)
      .then(({ result, territoryRead }) => {
        const leadHeat = window.computeLeadHeatIndex(state);
        const moratoriumText = territoryRead.note.type === 'moratorium'
          ? `${territoryRead.note.label}: flagged`
          : 'No moratorium in effect';

        const historyText = territoryRead.note.type === 'history'
          ? `${territoryRead.note.label} on file`
          : 'No comparable territory history on file';

        const perf = territoryRead.comparablePerformance;
        const sentiment = territoryRead.competitorSentiment;

        root.innerHTML = `
          <div class="step4-converge">
            <div class="step4-cards">
              <div class="step4-card step4-card--carried">
                <span class="step4-card__badge">From Step 2</span>
                <span class="step4-card__title">Lead Heat Index${infoIcon('leadHeat')}</span>
                <span class="step4-card__value">${leadHeat.score} / 100 · ${leadHeat.band}</span>
              </div>
              <div class="step4-card step4-card--carried">
                <span class="step4-card__badge">From Step 3</span>
                <span class="step4-card__title">GbBis Territory Read${infoIcon('territory')}</span>
                <span class="step4-card__value">${territoryRead.meetsStandardMinimum ? 'Meets standard minimum' : 'Medium Density Market only'}</span>
              </div>
              <div class="step4-card step4-card--benchmark">
                <span class="step4-card__badge">From BrightStar Benchmarking</span>
                <span class="step4-card__title">Comparable Territory Performance${infoIcon('benchmark')}</span>
                <ul class="step4-benchmark-figures">
                  <li><span>Median comparable revenue</span><strong>${formatRevenue(perf.medianRevenue)}</strong></li>
                  <li><span>Top-quartile average</span><strong>${formatRevenue(perf.topQuartileRevenue)}</strong></li>
                  <li><span>Bottom-quartile average</span><strong>${formatRevenue(perf.bottomQuartileRevenue)}</strong></li>
                </ul>
                <span class="step4-card__quartile">Resembles: ${perf.estimatedQuartile} quartile</span>
                <span class="step4-card__footnote">Directional estimate, not a guarantee.</span>
              </div>
              <div class="step4-card step4-card--new">
                <span class="step4-card__badge">New (Ours)</span>
                <span class="step4-card__title">Signals neither tool tracks</span>
                <ul class="step4-signal-list">
                  <li><span>Competing agencies in territory${infoIcon('competingAgencies')}</span><strong>${territoryRead.competingAgencyCount}</strong></li>
                  <li><span>Caregiver labor market${infoIcon('laborMarket')}</span><strong>${territoryRead.laborMarket}</strong></li>
                  <li><span>State licensure/moratorium status${infoIcon('moratorium')}</span><strong>${moratoriumText}</strong></li>
                  <li><span>Comparable territory history${infoIcon('history')}</span><strong>${historyText}</strong></li>
                  <li><span>Competitor review sentiment${infoIcon('sentiment')}</span><strong>${sentiment.avgStarRating}★ (${sentiment.reviewVolume} reviews)</strong></li>
                </ul>
              </div>
            </div>

            <div class="step4-arrow" aria-hidden="true">↓</div>

            <div class="step4-engine">
              <span class="step4-engine__label">Scoring Engine</span>
              <span class="step4-engine__sublabel">All of the above, read together</span>
            </div>
          </div>
        `;

        bindInfoAffordances(root);

        const el = root.querySelector('.step4-converge');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.classList.add('is-ready');
          });
        });
      })
      .catch((err) => {
        renderError(root, state, err.message || 'Unknown error.');
      });
  }

  function buildStep4Converge(state) {
    const root = document.createElement('div');
    root.className = 'step4-converge-root';
    const refresh = () => renderConvergence(root, state);
    refresh();
    return { element: root, refresh };
  }

  window.buildStep4Converge = buildStep4Converge;
})();
