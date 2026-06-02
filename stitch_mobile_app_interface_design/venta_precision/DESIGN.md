---
name: Venta Precision
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#383939'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1b1c1c'
  surface-container: '#1f2020'
  surface-container-high: '#292a2a'
  surface-container-highest: '#343535'
  on-surface: '#e3e2e2'
  on-surface-variant: '#e7bdb7'
  inverse-surface: '#e3e2e2'
  inverse-on-surface: '#303031'
  outline: '#ad8883'
  outline-variant: '#5d3f3c'
  surface-tint: '#ffb4aa'
  primary: '#ffb4aa'
  on-primary: '#690004'
  primary-container: '#e02020'
  on-primary-container: '#fff8f7'
  inverse-primary: '#c0000f'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#9acbff'
  on-tertiary: '#003355'
  tertiary-container: '#0077bf'
  on-tertiary-container: '#f7f9ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4aa'
  on-primary-fixed: '#410002'
  on-primary-fixed-variant: '#930009'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1b1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#d0e4ff'
  tertiary-fixed-dim: '#9acbff'
  on-tertiary-fixed: '#001d34'
  on-tertiary-fixed-variant: '#004a79'
  background: '#121414'
  on-background: '#e3e2e2'
  surface-variant: '#343535'
  bg-base: '#0a0a0a'
  surface-card: '#141414'
  surface-elevated: '#1e1e1e'
  border-low: '#2a2a2a'
  text-high: '#f0f0f0'
  text-inverse: '#ffffff'
  status-success: '#22c55e'
  status-warning: '#f59e0b'
  status-error: '#ef4444'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  headline-xl-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  space-xs: 4px
  space-sm: 8px
  space-md: 16px
  space-lg: 24px
  space-xl: 48px
  container-max: 1440px
  gutter: 16px
---

## Brand & Style

The brand identity is rooted in the "Venta Red" primary color, evoking the speed and precision of high-performance automotive engineering. This design system serves a technical, industrial environment where clarity and efficiency are paramount. The interface is high-density and information-rich, tailored for material management and inventory tracking.

The design style is **Modern / Industrial**, characterized by a dark, high-contrast palette and a rigid structural grid. It prioritizes utility and "summary-first" data visibility. Depth is achieved through tonal layering rather than shadows, creating a focused, developer-centric aesthetic that feels both robust and professional. The emotional response is one of reliability, precision, and technical authority.

## Colors

This design system uses a **dark-first** palette. The background is nearly black (`#0a0a0a`), providing a void-like canvas that allows the "Racing Red" primary color to act as a high-visibility beacon for actions and critical statuses.

- **Primary**: Used for branding, primary buttons, and active interactive states.
- **Surface Strategy**: Contrast is built through three tiers: Base (`#0a0a0a`), Surface (`#141414`), and Elevated (`#1e1e1e`). 
- **Semantic Indicators**: Status colors are vibrant and follow standard industrial conventions (Success: Green, Warning: Amber, Error: Red).
- **Borders**: Defined by a subtle but crisp gray (`#2a2a2a`) to maintain structure without visual noise.

## Typography

The system utilizes **Hanken Grotesk** for its clean, sharp, and modern appearance, fitting for a SaaS/Technical interface. To emphasize the industrial and data-heavy nature of inventory management, **JetBrains Mono** is introduced for labels, status badges, and numeric data.

- **Headlines**: Strong weights and tight letter-spacing for a technical feel.
- **Labels**: All uppercase or monospaced for quick identification in dense tables.
- **Data Tables**: Numeric values must use `data-mono` to ensure tabular alignment and readability for financial and measurement data (e.g., `1.234,56 €`).

## Layout & Spacing

The layout follows a **Fixed Grid** model on desktop (centering content) and switches to a fluid model for mobile. It is built on a 4px baseline rhythm to allow for the density required in management dashboards.

- **Grid**: A 12-column grid is used for desktop views.
- **Density**: Use `space-sm` (8px) for internal component padding and `space-md` (16px) for margins between related cards.
- **Mobile Adjustments**: On mobile (below 768px), horizontal page margins are fixed at 16px. Filter panels and KPI cards stack vertically to ensure large touch targets.
- **Inventory Views**: Use compact spacing for data rows (8px vertical padding) to maximize information density on one screen.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers** rather than shadows. This mimics a professional dashboard environment and ensures clarity in dark mode.

- **Tier 1 (Base)**: `#0a0a0a` - The main application canvas.
- **Tier 2 (Surface)**: `#141414` - Main cards, container backgrounds, and section groupings.
- **Tier 3 (Elevated)**: `#1e1e1e` - Hover states for interactive rows, input fields, and active tab indicators.
- **Borders**: All containers use a 1px solid border of `#2a2a2a` to define edges clearly against the dark background.
- **Modals**: For deep-focus tasks (e.g., Work Order creation), use a semi-transparent black overlay (80% opacity) behind a `surface-elevated` modal container.

## Shapes

The shape language is **Soft** but leaning toward sharp, emphasizing the industrial "precision" of the brand.

- **Components**: Standard buttons, inputs, and cards use a `0.25rem` (4px) corner radius.
- **Status Badges**: Use the same `0.25rem` radius to maintain a consistent geometric language across the UI.
- **Icons**: Should be stroke-based with clean, right-angled or slightly rounded terminations to match the typography.

## Components

### Buttons
- **Primary**: Solid Venta Red (`#e02020`) with white text. High-visibility.
- **Secondary**: Outlined with `--color-border` and `--color-text` labels.
- **Active States**: Hover transitions to `#ff2929`. Pressed/Active state shifts to `#b01818`.

### Input Fields
- **Container**: Surface-elevated background with a subtle border.
- **Focus**: Border color changes to Venta Red with a soft 2px outer glow of the same color.
- **Labels**: Use `label-caps` (monospaced) above the input.

### KPI Cards
- Large numeric value in the center using `headline-xl`.
- A small `label-caps` at the top for the title.
- Color coding for the value (Success green for profit, Error red for expenses).

### Status Badges
- Small, uppercase text using `label-caps`.
- Background color corresponds to status: Red (In Progress), Amber (Finished), Green (Confirmed).

### Lists & Tables
- **Rows**: 1px bottom border. Alternate row colors are not used; instead, use a highlight on hover (`surface-elevated`).
- **Data**: All measurements and currency must use the `data-mono` font style for precision.

### Toasts
- Floating at the bottom-center or top-right.
- High contrast: Black background with a primary color accent bar on the left.