// ─── Primitive Palette ───────────────────────────────────────────────────────
// Raw values. Never use these directly in components - use semantic tokens below.

const palette = {
  orange: {
    500: '#FF420B',
    900: '#400600',
    800: '#42170A',
  },
  black: {
    950: '#0F0F0F',
    900: '#1A1A1A',
    800: '#2A2A2A',
  },
  white: {
    1000: '#FFFFFF',
    900:  '#E5E5E5',
    800:  '#CFCFCF',
    600:  '#9E9E9E',
    400:  '#6E6E6E',
    300:  '#4D4D4D',
  },
  red:   { 500: '#FF3B30' },
  green: { 500: '#34C759' },
  amber: { 500: '#FF9500' },
} as const;

// ─── Semantic Tokens ─────────────────────────────────────────────────────────
// These are what components import. Names describe purpose, not appearance.

// Brand
export const PRIMARY_ORANGE         = palette.orange[500];
export const SHADOW_PRIMARY_ORANGE  = palette.orange[900];
export const SELECTED_CARD_BG       = palette.orange[800];

// Backgrounds
export const BLACK_PRIMARY          = palette.black[950];
export const CHAT_BACKGROUND_COLOR  = palette.black[900];
export const INPUT_BOX_COLOR        = palette.black[800];

// Text hierarchy
export const WHITE_PRIMARY          = palette.white[1000];
export const TEXT_LIGHT             = palette.white[900];
export const TEXT_WHITE_80          = palette.white[800];
export const TEXT_WHITE_60          = palette.white[600];
export const TEXT_WHITE_40          = palette.white[400];
export const TEXT_WHITE_30          = palette.white[300];

// Chat bubbles
export const CHAT_BUBBLE_USER_BG    = palette.orange[500];
export const CHAT_BUBBLE_AI_BG      = palette.white[900];
export const CHAT_BUBBLE_USER_TEXT  = palette.white[1000];
export const CHAT_BUBBLE_AI_TEXT    = palette.black[950];

// Status
export const ERROR_RED              = palette.red[500];
export const SUCCESS_GREEN          = palette.green[500];
export const WARNING_AMBER          = palette.amber[500];
