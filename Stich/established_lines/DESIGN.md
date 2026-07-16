---
name: Established Lines
colors:
  surface: '#fbf9f8'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#815433'
  on-secondary: '#ffffff'
  secondary-container: '#fec299'
  on-secondary-container: '#794e2d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c19'
  on-tertiary-container: '#84847f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffdcc5'
  secondary-fixed-dim: '#f5ba92'
  on-secondary-fixed: '#301400'
  on-secondary-fixed-variant: '#653d1e'
  tertiary-fixed: '#e4e2dd'
  tertiary-fixed-dim: '#c8c6c1'
  on-tertiary-fixed: '#1b1c19'
  on-tertiary-fixed-variant: '#474743'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  utility-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1440px
---

## Brand & Style
The design system embodies the "American Modern & Vintage" persona through a synthesis of heritage-driven editorial aesthetics and clean, architectural precision. It is designed for a curated seller experience that values provenance, craftsmanship, and longevity. 

The visual style is **Minimalist with Architectural influences**. It leverages generous whitespace to mimic the feel of a high-end gallery or a heritage lookbook. The emotional response is one of "Quiet Authority"—a professional, trustworthy environment that feels bespoke and independent while maintaining the functional rigor of a high-performance marketplace.

## Colors
The palette is rooted in a "Warm Monochrome" foundation to evoke aged parchment and architectural ink.

- **Primary Background (#FBF9F3):** A warm ivory that serves as the canvas for all interfaces, providing a softer, more premium alternative to stark white.
- **Primary Text (#1A1A1A):** A deep architectural charcoal used for high-contrast legibility and structural elements.
- **Accent (#8C5E3C):** A muted cognac utilized sparingly for calls to action, highlights, and indicating brand heritage.
- **System Grays:** Use subtle variations of the charcoal for secondary text (60% opacity) and hairline borders (15% opacity).

## Typography
The typographic hierarchy relies on the tension between the expressive **Playfair Display** (Serif) and the functional **Hanken Grotesk** (Sans-Serif).

- **Editorial Serif:** Used for headlines, brand storytelling, and featured product names. It should always be set with tighter letter spacing to maintain an architectural "locked-in" feel.
- **Modern Sans:** Used for all navigation, utility labels, data tables, and body copy. This ensures the marketplace remains highly legible and efficient for sellers managing inventory.
- **Labels:** Small labels should use Hanken Grotesk in Semi-Bold with uppercase styling and slight tracking to mimic archival cataloging.

## Layout & Spacing
This design system utilizes a **Fixed Grid** philosophy to maintain a structured, curated feel across large displays.

- **Grid:** A 12-column grid for desktop with 24px gutters. Elements should align strictly to the grid lines to emphasize the architectural theme.
- **Rhythm:** Spacing follows a 4px scale. Use 32px or 48px increments between major sections to ensure "Generous Whitespace."
- **Margins:** Desktop views should employ wide 64px side margins to "frame" the content like a book layout. On mobile, this scales down to 16px.
- **Reflow:** On tablet, the grid shifts to 8 columns; on mobile, a single column with stacked modules.

## Elevation & Depth
In alignment with the architectural and vintage theme, depth is communicated through **Tonal Layers and Thin Borders** rather than heavy shadows.

- **Tiers:** Use slight shifts in background tint (#F5F2E9) for container backgrounds to indicate elevation.
- **Outlines:** A "Low-Contrast Outline" approach is mandatory. Use 1px borders in a muted charcoal (20% opacity) to define cards and sections.
- **Shadows:** Avoid shadows for static elements. A single, very soft ambient shadow (Blur: 12px, Y: 4px, Color: #1A1A1A at 5% opacity) may be used exclusively for "floating" elements like dropdown menus or active modals.

## Shapes
The shape language is disciplined and geometric. 

- **Corner Radius:** A universal **4px radius** is applied to buttons, input fields, and cards. This provides just enough softness to feel "Modern" while remaining sharp enough to feel "Architectural."
- **Interactive Elements:** Buttons and form fields must maintain this 4px rule strictly—avoid pill shapes or fully rounded circles to preserve the vintage-grid aesthetic.

## Components
- **Buttons:** 
  - *Primary:* Solid #1A1A1A background, ivory text, 4px radius.
  - *Secondary:* 1px #1A1A1A border, transparent background, charcoal text.
  - *Accent:* Solid #8C5E3C background, ivory text, used only for "Finalize Purchase" or "Publish Listing."
- **Input Fields:** 1px #1A1A1A (15% opacity) border. On focus, the border darkens to 100% opacity charcoal. Labels are always Hanken Grotesk, 12px, uppercase.
- **Cards:** No background (transparent) with a 1px hairline border. The product title should be Playfair Display, and the price should be Hanken Grotesk.
- **Chips/Badges:** Small, rectangular (4px radius), using the ivory background with a 1px border. No solid color fills except for status indicators.
- **Lists/Tables:** High-density data tables for sellers should use hairline horizontal dividers only. No vertical lines. This creates a clean, ledger-style look.
- **Navigation:** Top-tier navigation uses Hanken Grotesk in Semi-Bold, centered, with generous 40px spacing between items.