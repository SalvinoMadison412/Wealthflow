---
name: Wealth Flow
colors:
  surface: '#ffffff'
  surface-dim: '#e0e0e0'
  surface-bright: '#ffffff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f5f5'
  surface-container: '#eeeeee'
  surface-container-high: '#e2e2e2'
  surface-container-highest: '#d6d6d6'
  on-surface: '#1a1a1a'
  on-surface-variant: '#5d5f5e'
  inverse-surface: '#333333'
  inverse-on-surface: '#f5f5f5'
  outline: '#8e8e8e'
  outline-variant: '#dadada'
  surface-tint: '#3d3d3d'
  primary: '#1a1c1c'
  on-primary: '#ffffff'
  primary-container: '#3d3d3d'
  on-primary-container: '#e8e8e8'
  inverse-primary: '#cfcfcf'
  secondary: '#5d5f5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#636564'
  tertiary: '#464647'
  on-tertiary: '#ffffff'
  tertiary-container: '#5e5e5e'
  on-tertiary-container: '#d9d8d7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6e6e6'
  primary-fixed-dim: '#cfcfcf'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#3d3d3d'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e4e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1b1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#ffffff'
  on-background: '#1a1a1a'
  surface-variant: '#d6d6d6'
  signal: '#000000'
  outline-editorial: '#8e8e8e'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: IBM Plex Mono
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: IBM Plex Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  numeral:
    fontFamily: Doto
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  expressive:
    fontFamily: Yuji Syuku
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  margin-page: 32px
  gutter: 20px
  stack-sm: 8px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style
This design system pairs a **Nothing/CMF-inspired technical aesthetic** for everyday UI with a separate **ink-brush expressive layer** reserved for brand moments — two registers, never blended. It is tailored for design-conscious users who prioritize clarity and intentionality over traditional data density.

The personality is precise, grid-based, and calm for the functional layer — dot-matrix numerals, exposed technical labels, corner-bracket annotations — with a considered artistic counterpoint (the wordmark, the launch motion) that keeps the brand from feeling clinical. The emotional response is one of control — moving away from the anxiety of "spreadsheet" finance toward a tool that feels engineered and intentional. Color is strictly black, white, and gray — no hue anywhere — with black and white treated as roughly equal presences rather than white-dominant-with-black-accent.

**Key Principles:**
- **Negative Space as Content:** Space is used as a functional element to separate ideas and reduce cognitive load.
- **Language over Data:** Financial status is communicated through clear, human-centric sentences rather than dense, overwhelming tables.
- **Intentional Friction:** High-impact actions are highlighted with bold accents, while secondary navigation remains understated and intuitive.

## Colors
The palette is strictly **black, white, and gray — no hue anywhere**, maintaining a high-contrast, premium editorial feel without an accent color.

- **Primary (#1a1c1c):** A near-black used for branding, primary buttons, and primary accents.
- **Signal (#000000):** Pure black, reserved exclusively for "Signals"—key insights, critical actions, or active states. It should occupy less than 5% of any given screen to maintain its impact.
- **Secondary (#5d5f5e):** A mid gray used for secondary typography and structural elements to provide a grounded, professional feel.
- **Neutral & Background (#eeeeee, #ffffff):** The foundation of the UI. Pure white is the primary surface, while very light grays (Surface Container) define subtle boundaries without the need for heavy borders.
- **Exception — Error (#ba1a1a):** Destructive/error states keep semantic red; this is an accessibility convention, not a brand accent hue.

## Typography
Two deliberately separate registers — never blended into one look.

- **Functional layer (all real UI — nav, forms, transaction data):** technical and grid-precise, in the spirit of Nothing/CMF. **Space Grotesk** for headlines/section titles (geometric grotesque, "designed" look, tight letter-spacing at display sizes). **IBM Plex Mono** for body copy, labels, and technical annotations — true monospace, highly legible at small sizes, gives every screen that grid-based, exposed-scaffolding feel. **Doto** (dot-matrix/bitmap) for balance and amount figures specifically — the Ndot-style numeral treatment, used only for real currency/count figures, never for prose.
- **Expressive layer (brand moments only):** **Yuji Syuku**, an authentic Shodō ink-brush digitization — used exclusively for the wordmark, the motion intro, and section dividers. Never appears in a form field, a transaction row, or general UI. Latin support is caps + small-caps only, which is the font's actual design.
- **Technical annotation habits:** small uppercase mono labels (e.g. "[AMOUNT]", "REGEX TAGS"), corner-bracket/reticle marks on key interactive targets, and solid black/white blocks used as real structural surfaces rather than accents — see Colors.

## Layout & Spacing
The layout philosophy is **Fixed Margin / Fluid Content**, optimized for a focused, mobile-first experience.

- **Margins:** Generous 32px side margins push content toward the center, creating an "optical focus" typical of premium publications.
- **Vertical Rhythm:** A strict 8px-based grid is used. "Stack-LG" (48px) is employed frequently between major conceptual blocks to ensure no screen feels crowded.
- **Grid Strategy:** On mobile, components span the full width between margins. On tablet and desktop, content is capped at a 600px central column to maintain optimal line length for readability.
- **Density:** Limit screens to a maximum of 3-4 primary elements to maintain the minimal aesthetic.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Subtle Shadows** to maintain a flat, modern appearance without losing hierarchy.

- **Surfaces:** Use `#ffffff` for the base canvas. Use `#f3f3f4` (Surface Container Low) for card elements to create a soft distinction from the background.
- **Shadows:** Use a single, signature "Ambient Shadow": `0px 10px 30px rgba(0, 0, 0, 0.04)`. It should be barely perceptible, serving only to lift a card slightly off the page.
- **Outlines:** Use low-contrast outlines (`#e2e2e2`) for secondary containers to provide structure without adding visual weight.
- **Transitions:** Use background blurs (16px) only for modal overlays to keep the focus on the "Flow" of the main feed.

## Shapes
The shape language is **Soft and Structural**, emphasizing professional architectural lines.

- **Containers:** Use a 4px (Soft) radius for primary cards and buttons. Avoid hyper-rounded or "pill" shapes for main containers to keep the design feeling sophisticated.
- **Interactive Elements:** Small interactive chips or signals may use a slightly more rounded 12px (rounded-xl) radius to differentiate them from structural layout blocks.
- **Visuals:** Any photography or data visualizations must follow the 4px corner radius rule to maintain consistency with the typography’s sharpness.

## Logo
Typographic only — no separate icon mark. The logo *is* the wordmark, set in Yuji Syuku (the expressive layer): full "WealthFlow" in the header/splash, a standalone brush "W" at tab-bar/app-icon scale. Monochrome, `on-surface` or white on dark.

## Motion
A Yin-Yang motif marks brand moments only (the launch sequence, and the statement-parsing loader) — never scattered decoratively. The launch intro: an accurate yin-yang (built as SVG — the one shape in the app that needs real path geometry) spins and scales into place, then resolves into the wordmark. Mirrors the app's actual credit/debit duality, not just black/white for its own sake. Respects OS reduce-motion with a static fallback frame.

## Components

### Buttons
- **Primary:** Solid black (#1a1c1c) with white text. High contrast, 4px corners.
- **Signal:** Solid pure black (#000000) for the single most important action on a screen.
- **Ghost:** No background, 1px border (#dadada), used for secondary actions.

### Insights & Cards
- **Editorial Card:** A white surface with the signature ambient shadow. Uses **Clash Display** for headlines and **Cabinet Grotesk** for insight text.
- **Signal Chip:** A small black dot or tag used to flag specific insights (e.g., "Overspent" or "Portfolio Milestone").

### Inputs & Forms
- **Minimalist Inputs:** No box containers. Use a single bottom border (1px #1a1c1c) with a floating label in **Cabinet Grotesk** (label-sm). The focus state thickens the bottom border to 2px.

### Navigation
- **The "Flow":** Prioritize simple, text-based navigation. Rely on vertical scrolling and horizontal swipes between major sections (Summary, Insights, settings).
- **Lists:** Lists should be divider-less. Use vertical spacing (Stack-MD) and font weights to create separation between line items.