/* ─────────────────────────────────────────────
   Bass Fretboard App — EADG Standard Tuning
───────────────────────────────────────────── */

// ── Music theory data ──────────────────────
const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ENHARMONIC = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };

// EADG standard tuning — open string notes (MIDI-style semitone index from C0)
// String 1 = G (highest), String 4 = E (lowest)  —  displayed top→bottom as G A D E
const STRINGS = [
  { name: 'G', openNote: 7  },   // G2
  { name: 'D', openNote: 2  },   // D2
  { name: 'A', openNote: 9  },   // A1
  { name: 'E', openNote: 4  },   // E1
];

const FRET_COUNT = 24;

// Interval semitone offsets from root
const SCALES = {
  major:           [0,2,4,5,7,9,11],
  minor:           [0,2,3,5,7,8,10],
  pentatonic_major:[0,2,4,7,9],
  pentatonic_minor:[0,3,5,7,10],
  blues:           [0,3,5,6,7,10],
  chromatic:       [0,1,2,3,4,5,6,7,8,9,10,11],
};

// Which scale degree index maps to which interval role
// major:  [R, 2, 3, 4, 5, 6, 7]  → root=0, third=2, fifth=4, octave=12
// minor:  [R, 2, b3, 4, 5, b6, b7] → root=0, third=2, fifth=4
// etc.
const INTERVAL_SEMITONES = {
  root:   [0],
  third:  [3,4],        // minor 3rd or major 3rd
  fifth:  [6,7,8],      // dim, perf, aug 5th
  octave: [12],
};

// Note name formatting
function noteName(semitone, preferFlats = false) {
  const idx = ((semitone % 12) + 12) % 12;
  const sharp = CHROMATIC[idx];
  if (!preferFlats) return sharp;
  return ENHARMONIC[sharp] || sharp;
}

// Classify a note against a root
function classifyInterval(rootSemitone, noteSemitone) {
  const diff = ((noteSemitone - rootSemitone) % 12 + 12) % 12;
  if (diff === 0) return 'root';
  if (diff === 12 || diff === 0) return 'octave'; // handled separately
  if (INTERVAL_SEMITONES.third.includes(diff)) return 'third';
  if (INTERVAL_SEMITONES.fifth.includes(diff)) return 'fifth';
  return 'other';
}

// Get all notes in a scale from root
function getScaleNotes(rootSemitone, scaleName) {
  const intervals = SCALES[scaleName] || SCALES.major;
  return intervals.map(i => ((rootSemitone + i) % 12 + 12) % 12);
}

// ── State ──────────────────────────────────
let state = {
  root: 0,                // C
  scale: 'major',
  activeIntervals: new Set(['root','third','fifth','octave','all']),
};

// ── Fretboard layout constants ─────────────
const SVG_PADDING_LEFT  = 56;   // space for string labels
const SVG_PADDING_RIGHT = 24;
const SVG_PADDING_TOP   = 28;
const SVG_PADDING_BOTTOM= 28;
const DOT_RADIUS        = 12;
const STRING_SPACING    = 44;   // px between strings
const FRET_WIDTH_BASE   = 52;   // width of fret 0 (nut→fret1)

// Calculate progressive fret widths (frets narrow slightly toward high end)
function getFretWidths() {
  const widths = [];
  for (let f = 0; f <= FRET_COUNT; f++) {
    // Very slight taper for realism — frets get ~0.6% narrower each step
    widths.push(Math.round(FRET_WIDTH_BASE * Math.pow(0.994, f)));
  }
  return widths;
}

function getFretPositions(widths) {
  const positions = [SVG_PADDING_LEFT]; // left edge (nut)
  for (let i = 0; i < widths.length; i++) {
    positions.push(positions[positions.length - 1] + widths[i]);
  }
  return positions;
}

const FRET_WIDTHS    = getFretWidths();
const FRET_POSITIONS = getFretPositions(FRET_WIDTHS);
const SVG_WIDTH  = FRET_POSITIONS[FRET_COUNT] + SVG_PADDING_RIGHT;
const SVG_HEIGHT = SVG_PADDING_TOP + STRING_SPACING * (STRINGS.length - 1) + SVG_PADDING_BOTTOM;

// Inlay fret positions (single dot)
const INLAY_FRETS_SINGLE = [3,5,7,9,15,17,19,21];
const INLAY_FRETS_DOUBLE = [12,24];

// ── Build SVG fretboard ────────────────────
function buildFretboard() {
  const svg = document.getElementById('fretboardSvg') || createSVG();
  svg.setAttribute('viewBox', `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`);
  svg.setAttribute('width', SVG_WIDTH);
  svg.setAttribute('height', SVG_HEIGHT);

  // Clear
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const scaleNotes = getScaleNotes(state.root, state.scale);

  // ── Background already on container ──
  // Fret 0 region (nut area) slightly darker
  const nutBg = makeSVG('rect', {
    x: SVG_PADDING_LEFT - 28, y: 0,
    width: 28, height: SVG_HEIGHT,
    fill: 'rgba(0,0,0,0.12)',
  });
  svg.appendChild(nutBg);

  // ── Inlays (position markers) ──────────
  for (const f of INLAY_FRETS_SINGLE) {
    if (f > FRET_COUNT) continue;
    const cx = (FRET_POSITIONS[f-1] + FRET_POSITIONS[f]) / 2;
    const cy = SVG_HEIGHT / 2;
    svg.appendChild(makeSVG('circle', { cx, cy, r: 8, fill: 'var(--color-inlay)' }));
  }
  for (const f of INLAY_FRETS_DOUBLE) {
    if (f > FRET_COUNT) continue;
    const cx = (FRET_POSITIONS[f-1] + FRET_POSITIONS[f]) / 2;
    const top = SVG_PADDING_TOP + STRING_SPACING * 1 - STRING_SPACING * 0.35;
    const bot = SVG_PADDING_TOP + STRING_SPACING * 2 + STRING_SPACING * 0.35;
    svg.appendChild(makeSVG('circle', { cx, cy: top, r: 8, fill: 'var(--color-inlay)' }));
    svg.appendChild(makeSVG('circle', { cx, cy: bot, r: 8, fill: 'var(--color-inlay)' }));
  }

  // ── Fret lines ─────────────────────────
  for (let f = 1; f <= FRET_COUNT; f++) {
    const x = FRET_POSITIONS[f];
    const isOctave = (f === 12 || f === 24);
    svg.appendChild(makeSVG('line', {
      x1: x, y1: SVG_PADDING_TOP - 4,
      x2: x, y2: SVG_HEIGHT - SVG_PADDING_BOTTOM + 4,
      stroke: 'var(--color-fret-line)',
      'stroke-width': isOctave ? 3 : 1.5,
      'stroke-linecap': 'round',
    }));
  }

  // ── Nut ───────────────────────────────
  svg.appendChild(makeSVG('rect', {
    x: SVG_PADDING_LEFT - 6, y: SVG_PADDING_TOP - 8,
    width: 6, height: SVG_HEIGHT - SVG_PADDING_TOP - SVG_PADDING_BOTTOM + 16,
    rx: 2,
    fill: 'var(--color-nut)',
    filter: 'drop-shadow(1px 0 2px rgba(0,0,0,0.2))',
  }));

  // ── Strings ───────────────────────────
  STRINGS.forEach((str, si) => {
    const y = SVG_PADDING_TOP + si * STRING_SPACING;
    // Thicker strings for lower strings (E and A are wound)
    const thickness = si >= 2 ? 2.8 - (si - 2) * 0.4 : 1.8 + (si) * 0.1;
    svg.appendChild(makeSVG('line', {
      x1: SVG_PADDING_LEFT - 6, y1: y,
      x2: FRET_POSITIONS[FRET_COUNT] + 16, y2: y,
      stroke: si >= 2 ? 'var(--color-string-wound)' : 'var(--color-string)',
      'stroke-width': thickness + (3 - si) * 0.3,
      'stroke-linecap': 'round',
    }));
  });

  // ── String labels ─────────────────────
  STRINGS.forEach((str, si) => {
    const y = SVG_PADDING_TOP + si * STRING_SPACING;
    const label = makeSVG('text', {
      x: SVG_PADDING_LEFT - 20,
      y: y + 4,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      fill: 'var(--color-all)',
      'font-size': '13',
      'font-family': 'var(--font-body)',
      'font-weight': '600',
    });
    label.textContent = str.name;
    svg.appendChild(label);
  });

  // ── Note dots ─────────────────────────
  // Open string notes (fret 0)
  STRINGS.forEach((str, si) => {
    const openSemitone = str.openNote % 12;
    const inScale = scaleNotes.includes(openSemitone);
    if (!inScale) return;

    const x = SVG_PADDING_LEFT - 34;
    const y = SVG_PADDING_TOP + si * STRING_SPACING;
    const role = getDotRole(openSemitone);
    if (!shouldShow(role)) return;

    appendDot(svg, x, y, openSemitone, role, str.name, 0);
  });

  // Fretted notes (fret 1 → FRET_COUNT)
  STRINGS.forEach((str, si) => {
    for (let f = 1; f <= FRET_COUNT; f++) {
      const semitone = (str.openNote + f) % 12;
      const inScale  = scaleNotes.includes(semitone);
      if (!inScale) continue;

      const cx = (FRET_POSITIONS[f-1] + FRET_POSITIONS[f]) / 2;
      const cy = SVG_PADDING_TOP + si * STRING_SPACING;
      const role = getDotRole(semitone);
      if (!shouldShow(role)) continue;

      appendDot(svg, cx, cy, semitone, role, str.name, f);
    }
  });

  return svg;
}

// Determine visual role of a note (root/third/fifth/octave/other)
function getDotRole(semitone) {
  const diff = ((semitone - state.root) % 12 + 12) % 12;
  if (diff === 0) return 'root';
  if (INTERVAL_SEMITONES.third.includes(diff)) return 'third';
  if (INTERVAL_SEMITONES.fifth.includes(diff)) return 'fifth';
  return 'other';
}

function shouldShow(role) {
  if (role === 'root'   && state.activeIntervals.has('root'))   return true;
  if (role === 'third'  && state.activeIntervals.has('third'))  return true;
  if (role === 'fifth'  && state.activeIntervals.has('fifth'))  return true;
  if (role === 'other'  && state.activeIntervals.has('all'))    return true;
  return false;
}

function appendDot(svg, cx, cy, semitone, role, stringName, fret) {
  const g = makeSVG('g', { class: `fret-dot dot-${role}` });
  g.setAttribute('tabindex', '0');
  g.setAttribute('role', 'button');

  const noteN  = noteName(semitone);
  const octaveLabel = getOctaveLabel(role, semitone);
  g.setAttribute('aria-label', `${noteN} on ${stringName} string fret ${fret}`);

  // Glow ring for root
  if (role === 'root') {
    g.appendChild(makeSVG('circle', {
      cx, cy,
      r: DOT_RADIUS + 5,
      fill: 'none',
      stroke: 'var(--color-accent)',
      'stroke-width': 1.5,
      opacity: 0.4,
    }));
  }

  // Main circle
  g.appendChild(makeSVG('circle', {
    cx, cy,
    r: DOT_RADIUS,
    fill: dotFill(role),
  }));

  // Note label
  const label = makeSVG('text', {
    x: cx, y: cy + 1,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    fill: dotTextColor(role),
    'font-size': noteN.length > 1 ? '9.5' : '11',
    'font-family': 'var(--font-body)',
    'font-weight': '700',
    'pointer-events': 'none',
    'user-select': 'none',
  });
  label.textContent = noteN;
  g.appendChild(label);

  // Tooltip interaction
  const tooltip = document.getElementById('noteTooltip');
  const intervalLabel = { root:'Root', third:'3rd', fifth:'5th', other:'Scale' }[role];
  const fullLabel = `${noteN} — ${intervalLabel}`;

  function showTip(e) {
    tooltip.textContent = fullLabel;
    tooltip.classList.add('visible');
    moveTip(e);
  }
  function moveTip(e) {
    const x = (e.touches ? e.touches[0].clientX : e.clientX);
    const y = (e.touches ? e.touches[0].clientY : e.clientY);
    tooltip.style.left = (x + 14) + 'px';
    tooltip.style.top  = (y - 32) + 'px';
  }
  function hideTip() { tooltip.classList.remove('visible'); }

  g.addEventListener('mouseenter', showTip);
  g.addEventListener('mousemove',  moveTip);
  g.addEventListener('mouseleave', hideTip);
  g.addEventListener('focus',      (e) => {
    const rect = g.getBoundingClientRect();
    tooltip.textContent = fullLabel;
    tooltip.classList.add('visible');
    tooltip.style.left = (rect.left + rect.width / 2) + 'px';
    tooltip.style.top  = (rect.top - 36) + 'px';
  });
  g.addEventListener('blur', hideTip);

  svg.appendChild(g);
}

function dotFill(role) {
  return {
    root:  'var(--color-accent)',
    third: 'var(--color-third)',
    fifth: 'var(--color-fifth)',
    other: 'var(--color-all)',
  }[role] || 'var(--color-all)';
}

function dotTextColor(role) {
  // All roles get light text (dots are vivid colors)
  return 'rgba(255,255,255,0.95)';
}

function getOctaveLabel(role, semitone) {
  return role === 'root' ? 'Root' : role === 'other' ? 'Note' : role.charAt(0).toUpperCase() + role.slice(1);
}

// ── SVG helpers ───────────────────────────
function makeSVG(tag, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function createSVG() {
  const svg = makeSVG('svg', {
    id: 'fretboardSvg',
    xmlns: 'http://www.w3.org/2000/svg',
    role: 'img',
  });
  document.getElementById('fretboard').appendChild(svg);
  return svg;
}

// ── Fret numbers ──────────────────────────
const MARKER_FRETS = new Set([3,5,7,9,12,15,17,19,21,24]);

function buildFretNumbers() {
  const row = document.getElementById('fretNumbers');
  row.innerHTML = '';
  // Add a spacer for the string-label column
  const spacer = document.createElement('div');
  spacer.style.width = SVG_PADDING_LEFT + 'px';
  spacer.style.flexShrink = '0';
  row.appendChild(spacer);

  for (let f = 0; f <= FRET_COUNT; f++) {
    const w = f === 0 ? FRET_WIDTHS[0] : FRET_WIDTHS[f];
    const div = document.createElement('div');
    div.className = 'fret-num' + (MARKER_FRETS.has(f) ? ' marker' : '');
    div.style.width = w + 'px';
    div.style.flexShrink = '0';
    div.textContent = f === 0 ? '' : String(f);
    row.appendChild(div);
  }
}

// ── Root picker ───────────────────────────
function buildRootPicker() {
  const container = document.getElementById('rootPicker');
  container.innerHTML = '';
  CHROMATIC.forEach((note, i) => {
    const btn = document.createElement('button');
    btn.className = 'note-btn' + (i === state.root ? ' active' : '');
    btn.textContent = note;
    btn.setAttribute('aria-pressed', i === state.root ? 'true' : 'false');
    btn.addEventListener('click', () => {
      state.root = i;
      document.querySelectorAll('.note-btn').forEach((b, j) => {
        b.classList.toggle('active', j === i);
        b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
      });
      render();
    });
    container.appendChild(btn);
  });
}

// ── Interval toggles ──────────────────────
function initIntervalToggles() {
  document.querySelectorAll('.interval-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const interval = btn.dataset.interval;
      if (state.activeIntervals.has(interval)) {
        state.activeIntervals.delete(interval);
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      } else {
        state.activeIntervals.add(interval);
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      }
      render();
    });
    btn.setAttribute('aria-pressed', 'true');
  });
}

// ── Scale tabs ────────────────────────────
function initScaleTabs() {
  document.querySelectorAll('.scale-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.scale = tab.dataset.scale;
      document.querySelectorAll('.scale-tab').forEach(t => {
        t.classList.toggle('active', t === tab);
      });
      render();
    });
  });
}

// ── Main render ───────────────────────────
function render() {
  // Remove old SVG
  const old = document.getElementById('fretboardSvg');
  if (old) old.remove();
  buildFretboard();
}

// ── Theme toggle ──────────────────────────
(function () {
  const root = document.documentElement;
  const toggle = document.querySelector('[data-theme-toggle]');
  // Default: dark
  let theme = 'dark';
  root.setAttribute('data-theme', theme);

  const SUN = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  const MOON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

  toggle.innerHTML = SUN; // currently dark → show sun to switch to light
  toggle.setAttribute('aria-label', 'Switch to light mode');

  toggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    toggle.innerHTML = theme === 'dark' ? SUN : MOON;
    toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  });
})();

// ── Scroll sync between fretboard & fret numbers ──
(function () {
  const boardWrap = document.querySelector('.fretboard-scroll-wrap');
  const numWrap   = document.querySelector('.fret-numbers-wrap');
  let syncLock = false;
  boardWrap.addEventListener('scroll', () => {
    if (syncLock) return;
    syncLock = true;
    numWrap.scrollLeft = boardWrap.scrollLeft;
    requestAnimationFrame(() => { syncLock = false; });
  });
  numWrap.addEventListener('scroll', () => {
    if (syncLock) return;
    syncLock = true;
    boardWrap.scrollLeft = numWrap.scrollLeft;
    requestAnimationFrame(() => { syncLock = false; });
  });
})();

// ── Init ──────────────────────────────────
buildRootPicker();
initIntervalToggles();
initScaleTabs();
buildFretNumbers();
render();
