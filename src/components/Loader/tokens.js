// BeatFit Loader — design tokens (palette pulled from the app icon)
// Used by all loader variants. Single source of truth.

export const BF = {
  // Backgrounds
  bg:        '#0d0d14',   // outer (matches icon background)
  bgInner:   '#12121f',   // inner panel (matches icon inner)
  bgRaised:  '#1a1a2a',
  divider:   '#1e1e30',
  hair:      '#2a2a45',

  // Ink
  ink:       '#ffffff',
  inkDim:    'rgba(255,255,255,0.55)',
  inkFaint:  'rgba(255,255,255,0.22)',
  inkGhost:  'rgba(255,255,255,0.08)',

  // Podium colors — blue is primary (icon's center / tallest)
  blue:       '#38bdf8',
  blueSoft:   '#7dd3fc',
  purple:     '#c084fc',
  purpleSoft: '#f0abfc',
  green:      '#34d399',
  greenSoft:  '#6ee7b7',

  // Typography
  display: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
};

// Default team — replace by passing your own `players` prop in production.
export const TEAM = [
  { id: 1, name: 'Jakub K.', initials: 'JK', color: BF.blue,   soft: BF.blueSoft   },
  { id: 2, name: 'Magda N.', initials: 'MN', color: BF.purple, soft: BF.purpleSoft },
  { id: 3, name: 'Tomáš V.', initials: 'TV', color: BF.green,  soft: BF.greenSoft  },
];

// Loader stage is designed at 340×720 (matches phone preview frame).
// LoaderShell scales this to fit the actual viewport.
export const STAGE_W = 340;
export const STAGE_H = 720;
