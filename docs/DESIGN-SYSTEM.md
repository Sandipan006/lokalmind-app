# LokalMind v2 — Design System

Covers: Liquid Glass implementation, color tokens, typography, spacing, navigation architecture.

---

## Liquid Glass

LokalMind v2 adopts Apple's Liquid Glass design language as its primary visual system. This is not a cosmetic layer — it is the design foundation from which all surfaces are built.

### Core Principles

- **Translucency over opacity** — surfaces reveal depth through blur, not flat color
- **Light adapts to context** — tints shift based on underlying content and brand state
- **Motion is physical** — animations feel like they have mass and inertia
- **Hierarchy through glass** — deeper (more important) elements are more opaque

### Implementation

**Primary**: `expo-glass-effect` — native iOS 26+ `UIVisualEffectView` via `GlassView` / `GlassContainer`.

**Fallback**: `expo-blur` `BlurView` for iOS < 26 — same visual token values, software blur.

**Rule**: Feature code never imports `GlassView` or `BlurView` directly. All glass surfaces use the `GlassSurface` component from `src/design-system/components/GlassSurface.tsx`, which handles the native/fallback decision internally.

```tsx
// Usage in any feature component
import { GlassSurface } from '@/src/design-system/components';

// Default neutral glass
<GlassSurface tier="heavy" style={styles.card}>
  {children}
</GlassSurface>

// Orange-warmed glass for active/selected states
<GlassSurface tier="heavy" tint="brand" style={styles.selectedCard}>
  {children}
</GlassSurface>
```

### Glass Tiers (`src/design-system/tokens/glass.ts`)

All glass surfaces sit over the brand dark backgrounds (`#0F0F0F`, `#1A1A1A`).

| Tier | Blur | Fallback Background | Usage |
|---|---|---|---|
| `ultra` | 40px | rgba(255,255,255,0.08) | Modal sheets, overlays, deep UI |
| `heavy` | 24px | rgba(255,255,255,0.12) | Cards, sidebars, drawers |
| `medium` | 16px | rgba(255,255,255,0.16) | Input bars, nav bars, chips |
| `light` | 8px | rgba(255,255,255,0.20) | Hover states, subtle highlights |

### Glass Tints

| Tint | Value | Usage |
|---|---|---|
| `default` | rgba(255,255,255,0.0) | Neutral frosted glass — most surfaces |
| `brand` | rgba(255,66,11,0.15) | Orange-warmed glass — selected model cards, active mode chips |

### GlassContainer

Use `GlassContainer` (from `expo-glass-effect`) for grouped glass surfaces that should merge visually — e.g. input bar + send button, sidebar header + list. Wrap via `GlassSurface` with `grouped` prop (to be implemented in Phase 2).

### Known Constraints

- Never set `opacity < 1` on a `GlassView` or its parent — causes the glass effect to not render. Use `glassEffectStyle` animate prop for fade transitions instead.
- `isInteractive` prop on `GlassView` can only be set on mount — cannot be changed dynamically. Remount with a different `key` to toggle.
- `GlassView` is iOS-only. On Android (Phase 2), `GlassSurface` falls back to `expo-blur`.

---

## Color Tokens (`src/design-system/tokens/colors.ts`)

Never use hex values in component files. Always import from this module.

### Brand & Accent

| Token | Value | Usage |
|---|---|---|
| `PRIMARY_ORANGE` | `#FF420B` | Primary CTA, user message bubbles, active states, send button |
| `SHADOW_PRIMARY_ORANGE` | `#400600` | Deep shadow for orange elements, pressed states |
| `SELECTED_CARD_BG` | `#42170A` | Selected/active card background (orange-tinted glass base) |

### Backgrounds & Surfaces

| Token | Value | Usage |
|---|---|---|
| `BLACK_PRIMARY` | `#0F0F0F` | Root app background |
| `CHAT_BACKGROUND_COLOR` | `#1A1A1A` | Chat screen background |
| `INPUT_BOX_COLOR` | `#2A2A2A` | Input fields, unselected cards |

### Text

| Token | Value | Usage |
|---|---|---|
| `WHITE_PRIMARY` | `#FFFFFF` | Primary headings, user message text |
| `TEXT_LIGHT` | `#E5E5E5` | Body text, secondary headings |
| `TEXT_WHITE_80` | `#CFCFCF` | Secondary body, subtitles |
| `TEXT_WHITE_60` | `#9E9E9E` | Placeholder text, captions |
| `TEXT_WHITE_40` | `#6E6E6E` | Disabled states, muted labels |
| `TEXT_WHITE_30` | `#4D4D4D` | Dividers, ghost text |

### Chat Bubbles

| Token | Value | Usage |
|---|---|---|
| `CHAT_BUBBLE_USER_BG` | `#FF420B` | User message bubble background |
| `CHAT_BUBBLE_AI_BG` | `#E6E6E6` | AI message bubble background |
| `CHAT_BUBBLE_USER_TEXT` | `#FFFFFF` | Text inside user bubble |
| `CHAT_BUBBLE_AI_TEXT` | `#000000` | Text inside AI bubble |

### Status

| Token | Value | Usage |
|---|---|---|
| `ERROR_RED` | `#FF0000` | Error states, failed downloads |
| `SUCCESS_GREEN` | `#00FF00` | Completed downloads, success states |

---

## Typography (`src/design-system/tokens/typography.ts`)

Font family: **Figtree** — loaded via `expo-font`. Never hardcode font names in component files.

```typescript
FONTS = {
  regular:  'Figtree-Regular',
  medium:   'Figtree-Medium',
  semiBold: 'Figtree-SemiBold',
  bold:     'Figtree-Bold',
}

FONT_SIZE = {
  xs:   11,   // captions, timestamps
  sm:   13,   // secondary labels, metadata
  md:   15,   // body text, chat messages
  lg:   17,   // primary labels, section headers
  xl:   20,   // screen titles
  xxl:  24,   // hero text
  xxxl: 32,   // splash / onboarding display
}
```

---

## Spacing (`src/design-system/tokens/spacing.ts`)

Never use raw pixel values in component files.

```typescript
SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
}

BORDER_RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
}
```

---

## Navigation Architecture

Built exclusively with **expo-router v6**. All routes are file-based. No `@react-navigation` packages used independently.

### Route Tree

```
app/
├── _layout.tsx              ← Root Stack. Font + notification init. Background: BLACK_PRIMARY.
├── index.tsx                ← Splash → onboarding decision
│
├── onboarding/
│   ├── _layout.tsx          ← Onboarding stack (no header)
│   ├── welcome.tsx          ← Step 1: value prop + Get Started CTA
│   ├── username.tsx         ← Step 2: name entry (single text input)
│   └── model-setup.tsx      ← Step 3: RAM detection + first model download
│
├── (tabs)/
│   ├── _layout.tsx          ← Bottom tab navigator
│   │                           tabBarStyle: BLACK_PRIMARY background, no top border
│   │                           activeTintColor: PRIMARY_ORANGE
│   ├── chat.tsx             ← Chat list / new chat entry point
│   ├── models.tsx           ← Model browser
│   └── profile.tsx          ← Profile + settings
│
├── chat/
│   └── [id].tsx             ← Individual chat session (ChatScreen)
│                               Background: CHAT_BACKGROUND_COLOR
├── model/
│   └── [id].tsx             ← Model detail + download
│
└── profile/
    ├── ai-behavior.tsx      ← Global system prompt + per-mode prompt editor
    ├── storage.tsx          ← Storage usage breakdown
    └── support.tsx          ← Help + feedback + GitHub link
```

### Navigation Flow

```
app/index.tsx
  ├── onboarding:complete = false  →  onboarding/welcome
  │                                     → username
  │                                     → model-setup
  │                                     → (tabs)/chat
  └── onboarding:complete = true   →  (tabs)/chat
```

### Tab Bar Design

- Background: `BLACK_PRIMARY` (`#0F0F0F`) with `GlassSurface tier="medium"` overlay
- No top border (`borderTopWidth: 0`)
- Active icon + label: `PRIMARY_ORANGE`
- Inactive icon + label: `TEXT_WHITE_40`
- Icons: custom SVG set from `react-native-svg`
