/**
 * Step 5 — Recommendation. Calls the real scoring API (via
 * lib/scoring-client.js, which wraps lib/api-client.js) with everything
 * collected in Steps 1-4, renders the Suitability Score, both sub-scores,
 * the full factor breakdown, an optional historical-precedent callout, a
 * band-branched recommendation panel, and the override control. No
 * scoring math or mock-data generation lives in this file.
 */

(function () {
  // Fixed mock alternate territories for the "also worth considering" /
  // "this territory may not be the right fit" panels. Deliberately plain
  // zips with no entry in mockdata.py's flagged-zip tables, so they read
  // as genuinely neutral alternatives rather than smuggling in a flag.
  const ALT_TERRITORIES = [
    { zip: '75201', label: 'Dallas, TX (75201)' },
    { zip: '33101', label: 'Miami, FL (33101)' },
    { zip: '60601', label: 'Chicago, IL (60601)' },
  ];

  const ACTION_TEXT = {
    'Lead Heat Index (carried in)':
      'Increase engagement. More calls/emails and closed touchpoints will lift the Lead Heat Index before proceeding.',
    'Capital adequacy vs. first-year cash need':
      "Confirm additional liquid capital on hand. Funding currently sits below BrightStar's typical $235k–$495k first-year cash need.",
    "Distance from candidate's home to territory":
      'Re-confirm the candidate can commit to the commute, or evaluate a closer territory. Current distance exceeds a comfortable 1-hour drive.',
    'Meets standard population / age 65+ minimum':
      'Confirm the candidate is comfortable with a smaller addressable population. This territory only qualifies as a Medium Density Market.',
    'Competitor density':
      'Review the competitive landscape in this territory before proceeding. Competitor density is elevated.',
    'Caregiver labor market tightness':
      'Build a caregiver recruiting plan early. The local labor market is tight.',
    'State licensure/moratorium status':
      'Confirm current licensure requirements with legal/compliance before proceeding. A state-level flag is on file.',
    'Comparable territory history match':
      'Review the historical precedent on file for this territory before finalizing.',
  };

  const GAP_TEXT = {
    'Lead Heat Index (carried in)':
      "Lead Heat Index is still low. Engagement and touchpoints haven't reached a strong level yet.",
    'Capital adequacy vs. first-year cash need':
      "Confirmed liquid capital sits well below BrightStar's typical first-year cash need.",
    "Distance from candidate's home to territory":
      "The candidate's commute to this territory is well beyond a comfortable 1-hour drive.",
  };

  function evaluateAltTerritories(state) {
    return Promise.all(
      ALT_TERRITORIES.map((alt) =>
        window.BrightStarApi.fetchTerritory(alt.zip)
          .then((territoryRead) => window.buildScoringPayload(state, territoryRead))
          .then((payload) => window.BrightStarApi.fetchScore(payload))
          .then((result) => Object.assign({}, alt, { result: result.territoryViability }))
      )
    );
  }

  function bandClass(band) {
    if (band === 'High') return 's5-band--good';
    if (band === 'Medium') return 's5-band--medium';
    return 's5-band--risk';
  }

  function gaugeHtml(score, band, size) {
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, score));
    const dashoffset = circumference * (1 - clamped / 100);
    const color =
      band === 'High' ? 'var(--status-good)' : band === 'Medium' ? 'var(--status-medium)' : 'var(--status-risk)';
    const c = size / 2;
    const fontSize = Math.round(size * 0.22);

    return `
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${c}" cy="${c}" r="${radius}" fill="none" stroke="var(--brand-blue-tint)" stroke-width="10"></circle>
        <circle cx="${c}" cy="${c}" r="${radius}" fill="none" stroke="${color}" stroke-width="10"
                stroke-linecap="round" transform="rotate(-90 ${c} ${c})"
                stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${dashoffset.toFixed(2)}"></circle>
        <text x="${c}" y="${c + fontSize / 3}" text-anchor="middle" class="s5-gauge__score"
              style="font-size:${fontSize}px;">${Math.round(score)}</text>
      </svg>
    `;
  }

  function factorRowHtml(f) {
    const pct = f.maxPoints > 0 ? (Math.max(0, f.points) / f.maxPoints) * 100 : 0;
    return `
      <div class="s5-factor">
        <span class="s5-factor__label">${f.name}</span>
        <div class="s5-factor__bar-track">
          <div class="s5-factor__bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="s5-factor__points">${f.points} / ${f.maxPoints}</span>
      </div>
    `;
  }

  function shortfall(f) {
    return f.maxPoints - f.points;
  }

  function pickTopShortfalls(factors, min, max) {
    const sorted = factors.slice().sort((a, b) => shortfall(b) - shortfall(a));
    const withGap = sorted.filter((f) => shortfall(f) > 0.001);
    return (withGap.length >= min ? withGap : sorted).slice(0, max);
  }

  function altListHtml(entries) {
    return `
      <ul class="s5-alt-list">
        ${entries
          .map(
            (e) => `<li><strong>${e.label}</strong>: Territory Viability ${e.result.score} / 100 (${e.result.band})</li>`
          )
          .join('')}
      </ul>
    `;
  }

  function buildAlsoWorthConsidering(state) {
    const wrap = document.createElement('div');
    wrap.className = 's5-panel s5-panel--expansion';
    wrap.innerHTML = `
      <h4 class="s5-panel__title">Also worth considering</h4>
      <p class="s5-panel__intro">This candidate scores well here. These fixed mock territories also look strong for the same candidate, as expansion opportunities.</p>
      <p class="s5-panel__empty">Checking alternate territories…</p>
    `;
    evaluateAltTerritories(state).then((evaluated) => {
      const strong = evaluated.filter((e) => e.result.band === 'High');
      const body = wrap.querySelector('.s5-panel__empty');
      body.outerHTML = strong.length
        ? altListHtml(strong)
        : '<p class="s5-panel__empty">None of the fixed alternate territories on file score as strongly as this one right now.</p>';
    });
    return wrap;
  }

  function buildTerritoryNotRightFit(state, result) {
    const wrap = document.createElement('div');
    wrap.className = 's5-panel s5-panel--territory-swap';
    wrap.innerHTML = `
      <h4 class="s5-panel__title">This territory may not be the right fit</h4>
      <p class="s5-panel__intro">Territory Viability is the main driver of the Low score here. These alternates score better for the same candidate:</p>
      <p class="s5-panel__empty">Checking alternate territories…</p>
    `;
    evaluateAltTerritories(state).then((evaluated) => {
      const better = evaluated
        .filter((e) => e.result.score > result.territoryViability.score)
        .sort((a, b) => b.result.score - a.result.score)
        .slice(0, 2);
      const body = wrap.querySelector('.s5-panel__empty');
      body.outerHTML = better.length
        ? altListHtml(better)
        : '<p class="s5-panel__empty">None of the fixed alternate territories on file score better than this one. The gap may be about this market generally, not an easy swap.</p>';
    });
    return wrap;
  }

  function buildPlanOfAction(result) {
    const wrap = document.createElement('div');
    wrap.className = 's5-panel s5-panel--plan';
    const chosen = pickTopShortfalls(result.factors, 2, 4);
    const steps = chosen.map((f) => ACTION_TEXT[f.name] || `Review "${f.name}": it scored below its full potential.`);

    wrap.innerHTML = `
      <h4 class="s5-panel__title">Plan of action</h4>
      <ol class="s5-plan-list">${steps.map((s) => `<li>${s}</li>`).join('')}</ol>
    `;
    return wrap;
  }

  function buildNotReadyYet(result) {
    const wrap = document.createElement('div');
    wrap.className = 's5-panel s5-panel--not-ready';
    const chosen = pickTopShortfalls(result.candidateReadiness.factors, 2, 3);
    const gaps = chosen.map((f) => GAP_TEXT[f.name] || `${f.name} scored below its full potential.`);

    wrap.innerHTML = `
      <h4 class="s5-panel__title">Not ready to proceed on this pairing yet</h4>
      <ul class="s5-gap-list">${gaps.map((g) => `<li>${g}</li>`).join('')}</ul>
      <p class="s5-panel__footer">Recommend pausing this specific pairing for further qualification rather than proceeding now. The gaps above are addressable, not disqualifying.</p>
    `;
    return wrap;
  }

  function buildRecommendationPanel(state, result) {
    if (result.overallBand === 'High') {
      return buildAlsoWorthConsidering(state);
    }
    if (result.overallBand === 'Medium') {
      return buildPlanOfAction(result);
    }
    const territoryIsDriver = result.territoryViability.score < result.candidateReadiness.score;
    return territoryIsDriver ? buildTerritoryNotRightFit(state, result) : buildNotReadyYet(result);
  }

  function buildPrecedentCallout(territoryRead) {
    const el = document.createElement('div');
    el.className = 's5-precedent';
    el.innerHTML = `
      <span class="s5-precedent__label">Nearest historical precedent</span>
      <p>${territoryRead.note.label}: ${territoryRead.note.text}</p>
    `;
    return el;
  }

  function buildOverridePanel(state, result) {
    const wrap = document.createElement('div');
    wrap.className = 's5-override';
    wrap.innerHTML = `
      <button type="button" class="s5-override__trigger">I'll proceed anyway</button>
      <div class="s5-override__form" hidden>
        <div>
          <label for="s5-override-reason">One-line reason</label>
          <input type="text" id="s5-override-reason" placeholder="Why proceed anyway?">
        </div>
        <button type="button" class="s5-override__confirm">Confirm override</button>
      </div>
      <p class="s5-override__confirmation" hidden></p>
    `;

    const trigger = wrap.querySelector('.s5-override__trigger');
    const form = wrap.querySelector('.s5-override__form');
    const input = wrap.querySelector('#s5-override-reason');
    const confirmBtn = wrap.querySelector('.s5-override__confirm');
    const confirmation = wrap.querySelector('.s5-override__confirmation');

    trigger.addEventListener('click', () => {
      trigger.hidden = true;
      form.hidden = false;
      input.focus();
    });

    confirmBtn.addEventListener('click', () => {
      const reason = input.value.trim();
      if (!reason) {
        input.focus();
        return;
      }

      const entry = {
        timestamp: new Date().toISOString(),
        candidateName: state.candidateName,
        territoryZip: state.territoryZip,
        overallScore: result.overallScore,
        overallBand: result.overallBand,
        reason,
      };

      window.overrideLog = window.overrideLog || [];
      window.overrideLog.push(entry);

      try {
        const existing = JSON.parse(localStorage.getItem('brightstar-override-log') || '[]');
        existing.push(entry);
        localStorage.setItem('brightstar-override-log', JSON.stringify(existing));
      } catch (e) {
        // localStorage unavailable (e.g. private browsing) — the
        // in-memory window.overrideLog above still holds this entry.
      }

      form.hidden = true;
      confirmation.hidden = false;
      confirmation.textContent = `Override recorded at ${new Date(entry.timestamp).toLocaleTimeString()}: “${reason}”`;
    });

    return wrap;
  }

  function renderLoading(root) {
    root.innerHTML = `<p class="s5-loading">Loading recommendation…</p>`;
  }

  function renderError(root, state, message) {
    root.innerHTML = `
      <div class="s5-error">
        <strong>Couldn't load the recommendation.</strong>
        <span>${message}</span>
        <button type="button" class="s5-error__retry">Retry</button>
      </div>
    `;
    root.querySelector('.s5-error__retry').addEventListener('click', () => renderStep5(root, state));
  }

  function renderStep5(root, state) {
    renderLoading(root);

    window.getScoreForState(state)
      .then(({ result, territoryRead }) => {
        root.innerHTML = '';

        const summary = document.createElement('div');
        summary.className = 's5-summary';
        summary.innerHTML = `
          <div class="s5-overall">
            ${gaugeHtml(result.overallScore, result.overallBand, 140)}
            <span class="s5-overall__label">Suitability Score</span>
            <span class="s5-overall__band ${bandClass(result.overallBand)}">${result.overallBand}</span>
          </div>
          <div class="s5-subscores">
            <div class="s5-subscore">
              ${gaugeHtml(result.candidateReadiness.score, result.candidateReadiness.band, 90)}
              <span class="s5-subscore__label">Candidate Readiness</span>
              <span class="s5-subscore__band ${bandClass(result.candidateReadiness.band)}">${result.candidateReadiness.band}</span>
            </div>
            <div class="s5-subscore">
              ${gaugeHtml(result.territoryViability.score, result.territoryViability.band, 90)}
              <span class="s5-subscore__label">Territory Viability</span>
              <span class="s5-subscore__band ${bandClass(result.territoryViability.band)}">${result.territoryViability.band}</span>
            </div>
          </div>
        `;
        root.appendChild(summary);

        const breakdown = document.createElement('div');
        breakdown.className = 's5-breakdown';
        breakdown.innerHTML = `
          <div class="s5-breakdown__group">
            <h4>Candidate Readiness factors</h4>
            ${result.candidateReadiness.factors.map(factorRowHtml).join('')}
          </div>
          <div class="s5-breakdown__group">
            <h4>Territory Viability factors</h4>
            ${result.territoryViability.factors.map(factorRowHtml).join('')}
          </div>
        `;
        root.appendChild(breakdown);

        if (territoryRead.note.type === 'history') {
          root.appendChild(buildPrecedentCallout(territoryRead));
        }

        root.appendChild(buildRecommendationPanel(state, result));

        // Nothing to override when the result is already green.
        if (result.overallBand !== 'High') {
          root.appendChild(buildOverridePanel(state, result));
        }
      })
      .catch((err) => {
        renderError(root, state, err.message || 'Unknown error.');
      });
  }

  function buildStep5Recommendation(state) {
    const root = document.createElement('div');
    root.className = 'step5-recommendation';
    const refresh = () => renderStep5(root, state);
    refresh();
    return { element: root, refresh };
  }

  window.buildStep5Recommendation = buildStep5Recommendation;
})();
