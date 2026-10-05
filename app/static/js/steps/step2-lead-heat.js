/**
 * Step 2 — Lead Heat Index, computed from Step 1's shared state.
 *
 * Read-only: no inputs here. The step is rebuilt (via onEnter) every time
 * it becomes visible, so edits made after going Back to Step 1 are always
 * reflected rather than showing a stale score.
 */

(function () {
  const BAND_STYLE = {
    Cold: { fill: '#777777', bg: '#eeeeee', text: '#555555' },
    Warm: { fill: '#f0ad4e', bg: '#fdf2e3', text: '#8a6116' },
    Hot: { fill: '#d9534f', bg: '#fbeceb', text: '#a94442' },
  };

  function bandForScore(score) {
    if (score >= 70) return 'Hot';
    if (score >= 40) return 'Warm';
    return 'Cold';
  }

  function bandRangeLabel(band) {
    if (band === 'Cold') return 'Score < 40';
    if (band === 'Warm') return 'Score 40–69';
    return 'Score ≥ 70';
  }

  function computeLeadHeatIndex(state) {
    const factors = [];
    let total = 0;

    const expPoints = state.priorExperience ? 15 : 0;
    total += expPoints;
    factors.push({
      label: 'Prior healthcare/home-care experience',
      detail: state.priorExperience ? 'Yes' : 'No',
      points: expPoints,
      max: 15,
    });

    let capPoints = 0;
    let capDetail = '< $100k';
    if (state.liquidCapital >= 150000) {
      capPoints = 20;
      capDetail = '≥ $150k';
    } else if (state.liquidCapital >= 100000) {
      capPoints = 10;
      capDetail = '≥ $100k';
    }
    total += capPoints;
    factors.push({
      label: 'Liquid capital confirmed',
      detail: `$${state.liquidCapital.toLocaleString()} (${capDetail})`,
      points: capPoints,
      max: 20,
    });

    const tp = state.touchpoints || {};
    const touchpointKeys = ['discoveryDay', 'fddDelivered', 'validationCalls', 'financingPrequalified'];
    const completedCount = touchpointKeys.filter((k) => tp[k]).length;
    const tpPoints = Math.min(completedCount, 4) * 10;
    total += tpPoints;
    factors.push({
      label: 'Touchpoints completed',
      detail: `${completedCount} of 4`,
      points: tpPoints,
      max: 40,
    });

    const engagementPoints = { Low: 5, Medium: 15, High: 25 };
    const engPoints = engagementPoints[state.engagementLevel] || 0;
    total += engPoints;
    factors.push({
      label: 'Email/call engagement level',
      detail: state.engagementLevel,
      points: engPoints,
      max: 25,
    });

    let daysPoints = 0;
    let daysDetail = '15–60 days';
    if (state.daysSinceInquiry <= 14) {
      daysPoints = 5;
      daysDetail = '≤ 14 days';
    } else if (state.daysSinceInquiry > 60) {
      daysPoints = -10;
      daysDetail = '> 60 days';
    }
    total += daysPoints;
    factors.push({
      label: 'Days since first inquiry',
      detail: `${state.daysSinceInquiry} days (${daysDetail})`,
      points: daysPoints,
      max: 5,
    });

    const score = Math.max(0, Math.min(100, total));
    return { score, rawTotal: total, factors, band: bandForScore(score) };
  }

  function factorRowHtml(f) {
    const pct = (Math.max(0, f.points) / f.max) * 100;
    const sign = f.points > 0 ? 'pos' : f.points < 0 ? 'neg' : 'zero';
    const pointsText = f.points > 0 ? `+${f.points}` : `${f.points}`;
    return `
      <div class="fc-factor">
        <div class="fc-factor__text">
          <span class="fc-factor__label">${f.label}</span>
          <span class="fc-factor__detail">${f.detail}</span>
        </div>
        <div class="fc-factor__bar-track">
          <div class="fc-factor__bar-fill fc-factor__bar-fill--${sign}" style="width:${pct}%"></div>
        </div>
        <span class="fc-factor__points fc-factor__points--${sign}">${pointsText}</span>
      </div>
    `;
  }

  function renderLeadHeat(root, state) {
    const result = computeLeadHeatIndex(state);
    const style = BAND_STYLE[result.band];

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference * (1 - result.score / 100);

    root.innerHTML = `
      <div class="fc-embed">
        <div class="fc-embed__header">
          <span class="fc-badge">From FranConnect</span>
        </div>
        <h3 class="fc-embed__title">Lead Heat Index</h3>
        <div class="fc-embed__gauge-row">
          <svg viewBox="0 0 140 140" width="140" height="140" role="img"
               aria-label="Lead Heat Index score ${result.score} out of 100, ${result.band}">
            <circle cx="70" cy="70" r="${radius}" fill="none" stroke="#e0e0e0" stroke-width="12"></circle>
            <circle cx="70" cy="70" r="${radius}" fill="none" stroke="${style.fill}" stroke-width="12"
                    stroke-linecap="round" transform="rotate(-90 70 70)"
                    stroke-dasharray="${circumference.toFixed(2)}"
                    stroke-dashoffset="${dashoffset.toFixed(2)}"></circle>
            <text x="70" y="66" text-anchor="middle" class="fc-gauge__score">${result.score}</text>
            <text x="70" y="86" text-anchor="middle" class="fc-gauge__denom">/ 100</text>
          </svg>
          <div class="fc-band" style="background:${style.bg}; color:${style.text};">
            <span class="fc-band__label">${result.band}</span>
            <span class="fc-band__range">${bandRangeLabel(result.band)}</span>
          </div>
        </div>
        <div class="fc-factors">
          ${result.factors.map(factorRowHtml).join('')}
        </div>
      </div>
    `;
  }

  function buildStep2LeadHeat(state) {
    const root = document.createElement('div');
    root.className = 'step2-lead-heat';
    const refresh = () => renderLeadHeat(root, state);
    refresh();
    return { element: root, refresh };
  }

  window.buildStep2LeadHeat = buildStep2LeadHeat;
  window.computeLeadHeatIndex = computeLeadHeatIndex;
})();
