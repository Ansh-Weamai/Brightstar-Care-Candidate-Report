/**
 * TourShell — reusable linear-tour chrome: a two-column layout pairing a
 * per-step editorial aside (headline, narrative, numbered list) with the
 * step's own form/content card (progress bar, Back/Next nav, Exit control,
 * keyboard navigation).
 *
 * Steps are plain DOM elements the caller builds and hands in. TourShell
 * never clones, recreates, or clears them — it only toggles visibility —
 * so any input a visitor has already touched survives Back/Next for free.
 *
 * A step may also define `onEnter()`, called every time it becomes the
 * visible step (including via Back) — for a read-only step computed from
 * other steps' data, this is where it recomputes against current state.
 *
 * Each step's `aside` describes the left-hand panel for that step:
 *   aside: {
 *     eyebrow: 'STEP 1 OF 5 · INTAKE',
 *     headline: 'Everything you <em>already</em> know about this deal.', // trusted HTML, authored inline, never user input
 *     body: 'Plain-text supporting paragraph.',
 *     listTitle: 'WHAT HAPPENS NEXT',
 *     items: [{ heading: '...', text: '...' }, ...], // exactly 3, rendered numbered 01/02/03
 *   }
 *
 * Usage:
 *   const tour = new TourShell(document.getElementById('tour-root'), {
 *     steps: [
 *       { name: 'Welcome', aside: {...}, element: document.getElementById('step-1'), onEnter: () => {} },
 *       ...
 *     ],
 *     onExit: () => { ... },
 *     onComplete: () => { ... },
 *   });
 */

(function () {
  // Input types with their own native arrow-key (or Enter) behavior that
  // our global Back/Next shortcuts must not hijack. 'radio' matters most:
  // without it, ArrowLeft/ArrowRight on a focused radio fires both the
  // browser's native "move to and select the next option in the group"
  // AND our preventDefault()'d next()/back(), which cancels the native
  // selection partway through and leaves the whole group unchecked.
  const NATIVE_KEY_INPUT_TYPES = [
    'text', 'search', 'email', 'url', 'tel', 'password',
    'number', 'date', 'time', 'datetime-local', 'month', 'week', 'color', 'range',
    'radio',
  ];

  function isInteractiveFormContext(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'BUTTON' || tag === 'A') return true;
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    if (tag === 'INPUT') {
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      return NATIVE_KEY_INPUT_TYPES.includes(type);
    }
    return false;
  }

  class TourShell {
    constructor(root, options) {
      this.root = root;
      this.steps = options.steps || [];
      this.onExit = options.onExit || (() => {});
      this.onComplete = options.onComplete || null;
      this.index = 0;

      this._handleKeydown = this._handleKeydown.bind(this);

      this._build();
      this._bindEvents();
      this._render();
    }

    _build() {
      this.root.innerHTML = `
        <div class="tour-layout">
          <aside class="tour-aside" data-role="aside">
            <span class="tour-aside__eyebrow" data-role="aside-eyebrow"></span>
            <h2 class="tour-aside__headline" data-role="aside-headline"></h2>
            <p class="tour-aside__body" data-role="aside-body"></p>
            <span class="tour-aside__list-title" data-role="aside-list-title"></span>
            <ol class="tour-aside__list" data-role="aside-list"></ol>
            <div class="tour-aside__trust">
              <span class="tour-aside__trust-label">Reading live from</span>
              <div class="tour-aside__trust-chips">
                <span class="tour-aside__trust-chip">FranConnect</span>
                <span class="tour-aside__trust-chip">GbBis</span>
                <span class="tour-aside__trust-chip">BrightStar Benchmarking</span>
              </div>
            </div>
          </aside>
          <div class="tour-shell" role="group" aria-roledescription="guided tour">
            <div class="tour-shell__header">
              <div class="tour-shell__topline">
                <span class="tour-shell__step-label" data-role="step-label"></span>
                <button type="button" class="tour-shell__exit" data-role="exit">Exit tour</button>
              </div>
              <div class="tour-shell__progress-track"
                   role="progressbar"
                   aria-valuemin="1"
                   data-role="progress-track">
                <div class="tour-shell__progress-fill" data-role="progress-fill"></div>
              </div>
            </div>
            <div class="tour-shell__stage">
              <div class="tour-shell__content" data-role="content"></div>
            </div>
            <div class="tour-shell__footer">
              <button type="button" class="tour-shell__nav-btn tour-shell__back" data-role="back">Back</button>
              <button type="button" class="tour-shell__nav-btn tour-shell__next" data-role="next">Next</button>
            </div>
          </div>
        </div>
      `;

      this.el = {
        stepLabel: this.root.querySelector('[data-role="step-label"]'),
        exitBtn: this.root.querySelector('[data-role="exit"]'),
        progressTrack: this.root.querySelector('[data-role="progress-track"]'),
        progressFill: this.root.querySelector('[data-role="progress-fill"]'),
        content: this.root.querySelector('[data-role="content"]'),
        backBtn: this.root.querySelector('[data-role="back"]'),
        nextBtn: this.root.querySelector('[data-role="next"]'),
        asideEyebrow: this.root.querySelector('[data-role="aside-eyebrow"]'),
        asideHeadline: this.root.querySelector('[data-role="aside-headline"]'),
        asideBody: this.root.querySelector('[data-role="aside-body"]'),
        asideListTitle: this.root.querySelector('[data-role="aside-list-title"]'),
        asideList: this.root.querySelector('[data-role="aside-list"]'),
      };

      this.el.progressTrack.setAttribute('aria-valuemax', String(this.steps.length));
    }

    _bindEvents() {
      this.el.backBtn.addEventListener('click', () => this.back());
      this.el.nextBtn.addEventListener('click', () => this.next());
      this.el.exitBtn.addEventListener('click', () => this.onExit());
      document.addEventListener('keydown', this._handleKeydown);
    }

    _handleKeydown(e) {
      if (isInteractiveFormContext(document.activeElement)) return;

      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'Backspace' || e.key === 'ArrowLeft') {
        e.preventDefault();
        this.back();
      }
    }

    _render() {
      const step = this.steps[this.index];
      const total = this.steps.length;
      const n = this.index + 1;

      // Visually hidden (see CSS) — screen-reader orientation only, since
      // the aside's eyebrow carries this same "Step X of Y" cue visually.
      this.el.stepLabel.textContent = `Step ${n} of ${total}: ${step.name}`;

      const aside = step.aside || {};
      this.el.asideEyebrow.textContent = aside.eyebrow || '';
      this.el.asideHeadline.innerHTML = aside.headline || '';
      this.el.asideBody.textContent = aside.body || '';
      this.el.asideListTitle.textContent = aside.listTitle || '';
      this.el.asideList.innerHTML = (aside.items || [])
        .map((item, i) => `
          <li>
            <span class="num">${String(i + 1).padStart(2, '0')}</span>
            <span>
              <span class="item-heading">${item.heading}</span>
              <span class="item-text">${item.text}</span>
            </span>
          </li>
        `)
        .join('');

      // Swap visible content: previous step's element is detached (not
      // destroyed) and kept in memory on the step object, so its filled-in
      // values are untouched whenever the visitor comes back to it.
      this.el.content.innerHTML = '';
      this.el.content.appendChild(step.element);

      // Optional per-step hook, called every time this step becomes visible
      // (including returning via Back). Lets a read-only, derived step
      // recompute itself from shared state instead of going stale.
      if (typeof step.onEnter === 'function') {
        step.onEnter();
      }

      const progressPct = Math.round((n / total) * 100);
      this.el.progressFill.style.width = `${progressPct}%`;
      this.el.progressTrack.setAttribute('aria-valuenow', String(n));
      this.el.progressTrack.setAttribute('aria-valuetext', `Step ${n} of ${total}`);

      this.el.backBtn.disabled = this.index === 0;
      this.el.backBtn.setAttribute('aria-disabled', String(this.index === 0));

      const isLast = this.index === total - 1;
      this.el.nextBtn.textContent = isLast ? 'Finish' : 'Next';
    }

    next() {
      const isLast = this.index === this.steps.length - 1;
      if (isLast) {
        if (this.onComplete) this.onComplete();
        return;
      }
      this.index += 1;
      this._render();
    }

    back() {
      if (this.index === 0) return;
      this.index -= 1;
      this._render();
    }

    destroy() {
      document.removeEventListener('keydown', this._handleKeydown);
    }
  }

  window.TourShell = TourShell;
})();
