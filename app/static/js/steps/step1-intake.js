/**
 * Step 1 — Candidate + Territory Intake.
 *
 * Builds the DOM for the step and keeps `state` (the tour's shared state
 * object) in sync with the form as the visitor edits it. Defaults live only
 * in the markup (value=/checked attributes below) — state is read from the
 * DOM once on build, so there is a single source of truth for "what Next
 * sees if nobody touches a field."
 *
 * Also includes 5 quick-select demo scenario buttons, one per Step 5
 * outcome path documented in docs/demo-paths.md. Each sets every field
 * explicitly (not just deltas) so scenarios don't bleed into each other
 * if clicked back-to-back.
 */

(function () {
  const DEMO_SCENARIOS = [
    {
      key: 'high',
      label: 'High',
      candidateName: 'Jordan Alvarez',
      territoryZip: '90210',
      priorExperience: true,
      liquidCapital: 165000,
      daysSinceInquiry: 11,
      engagementLevel: 'High',
      touchpoints: { discoveryDay: true, fddDelivered: true, validationCalls: false, financingPrequalified: false },
      distanceFromTerritory: '8 miles from assigned zip',
    },
    {
      key: 'medium-candidate',
      label: 'Medium (candidate-driven)',
      candidateName: 'Jordan Alvarez',
      territoryZip: '60614',
      priorExperience: true,
      liquidCapital: 80000,
      daysSinceInquiry: 30,
      engagementLevel: 'Medium',
      touchpoints: { discoveryDay: true, fddDelivered: true, validationCalls: false, financingPrequalified: false },
      distanceFromTerritory: '90 miles from assigned zip',
    },
    {
      key: 'medium-territory',
      label: 'Medium (territory-driven)',
      candidateName: 'Jordan Alvarez',
      territoryZip: '30301',
      priorExperience: true,
      liquidCapital: 165000,
      daysSinceInquiry: 11,
      engagementLevel: 'High',
      touchpoints: { discoveryDay: true, fddDelivered: true, validationCalls: false, financingPrequalified: false },
      distanceFromTerritory: '8 miles from assigned zip',
    },
    {
      key: 'low-candidate',
      label: 'Low (candidate-driven)',
      candidateName: 'Jordan Alvarez',
      territoryZip: '77001',
      priorExperience: false,
      liquidCapital: 5000,
      daysSinceInquiry: 30,
      engagementLevel: 'Low',
      touchpoints: { discoveryDay: false, fddDelivered: false, validationCalls: false, financingPrequalified: false },
      distanceFromTerritory: '150 miles from assigned zip',
    },
    {
      key: 'low-territory',
      label: 'Low (territory-driven)',
      candidateName: 'Jordan Alvarez',
      territoryZip: '19101',
      priorExperience: true,
      liquidCapital: 150000,
      daysSinceInquiry: 30,
      engagementLevel: 'Medium',
      touchpoints: { discoveryDay: true, fddDelivered: false, validationCalls: false, financingPrequalified: false },
      distanceFromTerritory: '50 miles from assigned zip',
    },
  ];

  function readFormIntoState(root, state) {
    const val = (name) => root.querySelector(`[name="${name}"]`).value;
    const checkedRadio = (name) => root.querySelector(`[name="${name}"]:checked`).value;
    const isChecked = (name) => root.querySelector(`[name="${name}"]`).checked;

    state.candidateName = val('candidateName');
    state.territoryZip = val('territoryZip');
    state.priorExperience = checkedRadio('priorExperience') === 'yes';
    state.liquidCapital = Number(val('liquidCapital'));
    state.daysSinceInquiry = Number(val('daysSinceInquiry'));
    state.engagementLevel = checkedRadio('engagementLevel');
    state.touchpoints = {
      discoveryDay: isChecked('touchpoint-discoveryDay'),
      fddDelivered: isChecked('touchpoint-fddDelivered'),
      validationCalls: isChecked('touchpoint-validationCalls'),
      financingPrequalified: isChecked('touchpoint-financingPrequalified'),
    };
    state.distanceFromTerritory = val('distanceFromTerritory');
  }

  function applyScenario(root, state, scenario) {
    const setVal = (name, value) => {
      root.querySelector(`[name="${name}"]`).value = value;
    };
    const setRadio = (name, value) => {
      root.querySelectorAll(`[name="${name}"]`).forEach((el) => {
        el.checked = el.value === value;
      });
    };
    const setChecked = (name, checked) => {
      root.querySelector(`[name="${name}"]`).checked = checked;
    };

    setVal('candidateName', scenario.candidateName);
    setVal('territoryZip', scenario.territoryZip);
    setRadio('priorExperience', scenario.priorExperience ? 'yes' : 'no');
    setVal('liquidCapital', scenario.liquidCapital);
    setVal('daysSinceInquiry', scenario.daysSinceInquiry);
    setRadio('engagementLevel', scenario.engagementLevel);
    Object.keys(scenario.touchpoints).forEach((key) => setChecked(`touchpoint-${key}`, scenario.touchpoints[key]));
    setVal('distanceFromTerritory', scenario.distanceFromTerritory);

    readFormIntoState(root, state);
  }

  function buildStep1Intake(state) {
    const root = document.createElement('div');
    root.className = 'step1-intake';
    root.innerHTML = `
      <div class="demo-scenarios">
        <span class="demo-scenarios__label">Quick-select a demo scenario:</span>
        <div class="demo-scenarios__buttons">
          ${DEMO_SCENARIOS.map((s) => `<button type="button" class="demo-scenario-btn" data-scenario="${s.key}">${s.label}</button>`).join('')}
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="f-candidateName">Candidate name</label>
          <input type="text" id="f-candidateName" name="candidateName" value="Jordan Alvarez">
        </div>
        <div class="field">
          <label for="f-territoryZip">Target territory zip code</label>
          <input type="text" id="f-territoryZip" name="territoryZip" value="78701" inputmode="numeric">
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <span class="field-label" id="f-priorExperience-label">Prior healthcare/home-care experience</span>
          <div class="choice-group" role="radiogroup" aria-labelledby="f-priorExperience-label">
            <label class="choice-pill">
              <input type="radio" name="priorExperience" value="yes" checked>
              <span>Yes</span>
            </label>
            <label class="choice-pill">
              <input type="radio" name="priorExperience" value="no">
              <span>No</span>
            </label>
          </div>
        </div>
        <div class="field">
          <span class="field-label" id="f-engagementLevel-label">Email/call engagement level</span>
          <div class="choice-group" role="radiogroup" aria-labelledby="f-engagementLevel-label">
            <label class="choice-pill">
              <input type="radio" name="engagementLevel" value="Low">
              <span>Low</span>
            </label>
            <label class="choice-pill">
              <input type="radio" name="engagementLevel" value="Medium">
              <span>Medium</span>
            </label>
            <label class="choice-pill">
              <input type="radio" name="engagementLevel" value="High" checked>
              <span>High</span>
            </label>
          </div>
        </div>
      </div>

      <div class="field-row">
        <div class="field">
          <label for="f-liquidCapital">Liquid capital confirmed</label>
          <div class="input-prefix">
            <span class="prefix-symbol">$</span>
            <input type="number" id="f-liquidCapital" name="liquidCapital" value="165000" min="0" step="1000">
          </div>
        </div>
        <div class="field">
          <label for="f-daysSinceInquiry">Days since first inquiry</label>
          <input type="number" id="f-daysSinceInquiry" name="daysSinceInquiry" value="11" min="0">
        </div>
      </div>

      <div class="field">
        <span class="field-label">Touchpoints</span>
        <div class="checkbox-list">
          <label class="checkbox-item">
            <input type="checkbox" name="touchpoint-discoveryDay" checked>
            <span>Discovery Day attended</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" name="touchpoint-fddDelivered" checked>
            <span>FDD delivered &amp; reviewed</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" name="touchpoint-validationCalls">
            <span>Validation calls completed</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" name="touchpoint-financingPrequalified">
            <span>Financing pre-qualified</span>
          </label>
        </div>
      </div>

      <div class="field">
        <label for="f-distanceFromTerritory">Candidate's distance from the territory</label>
        <input type="text" id="f-distanceFromTerritory" name="distanceFromTerritory" value="8 miles from assigned zip">
      </div>
    `;

    const sync = () => readFormIntoState(root, state);
    root.addEventListener('input', sync);

    root.querySelectorAll('.demo-scenario-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scenario = DEMO_SCENARIOS.find((s) => s.key === btn.dataset.scenario);
        if (scenario) applyScenario(root, state, scenario);
      });
    });

    sync(); // populate state immediately so Next works without any edits

    return root;
  }

  window.buildStep1Intake = buildStep1Intake;
})();
