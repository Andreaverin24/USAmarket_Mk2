---
name: The Guild Design System
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
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
  secondary: '#6f5a4a'
  on-secondary: '#ffffff'
  secondary-container: '#faddc8'
  on-secondary-container: '#756050'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1b'
  on-tertiary-container: '#838482'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#faddc8'
  secondary-fixed-dim: '#dcc2ad'
  on-secondary-fixed: '#27180c'
  on-secondary-fixed-variant: '#564334'
  tertiary-fixed: '#e3e2e0'
  tertiary-fixed-dim: '#c7c6c5'
  on-tertiary-fixed: '#1a1c1b'
  on-tertiary-fixed-variant: '#464746'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 64px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-md:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
  label-md:
    fontFamily: Public Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-xl: 120px
  stack-lg: 80px
  stack-md: 40px
  stack-sm: 24px
---

## Brand & Style

This design system is rooted in the principles of architectural minimalism and editorial sophistication. It is designed for a high-end furniture marketplace where the product—the furniture—is the protagonist. The brand personality is authoritative, calm, and curation-focused, catering to a discerning audience of collectors, interior designers, and premium sellers.

The aesthetic follows a **Minimalist / Architectural** direction. It avoids transient digital trends like glassmorphism or neomorphism in favor of structural integrity, rigid grids, and high-contrast intentionality. The UI acts as a silent gallery frame: unobtrusive, precise, and permanent. It prioritizes clarity over decoration, using whitespace as a functional element to denote luxury and breathing room.

## Colors

The palette is derived from natural, architectural materials—stone, wood, and carbon. 

- **Gallery White (#FFFFFF):** The primary canvas for all marketplace and editorial views.
- **Architectural Charcoal (#1A1A1A):** Used for primary typography and structural elements to provide a heavy, grounded contrast.
- **Deep Walnut (#4D3B2C):** An accent reserved for interactive states, highlighting craftsmanship and organic warmth.
- **Soft Stone (#F9F8F6):** Used for secondary surfaces, dashboard backgrounds, and subtle sectioning to prevent the UI from feeling sterile.

High contrast is maintained between Charcoal and White to ensure readability and an "ink-on-paper" feel.

## Typography

The typographic hierarchy relies on the tension between the classic, high-contrast strokes of **Playfair Display** and the pragmatic, accessible clarity of **Public Sans**.

- **Headlines:** Use Playfair Display for all editorial content and product titles. For larger displays, use a slight negative letter-spacing to enhance the architectural feel.
- **Body & UI:** Use Public Sans. It provides the necessary neutrality for complex dashboards and utility-driven mobile interfaces.
- **Labels:** Small caps with generous tracking (letter-spacing) should be used for category headers, metadata, and overlines to evoke a premium, catalog-like quality.

## Layout & Spacing

The layout is governed by a strict 12-column grid on desktop and a 4-column grid on mobile. 

- **Editorial Layouts:** Use asymmetrical column spans (e.g., imagery spanning 7 columns, text spanning 4 columns with a 1-column offset) to create dynamic, magazine-style compositions.
- **Dashboards:** Use a fixed-sidebar layout with a fluid content area. Information density is managed through clear horizontal rules rather than boxed containers.
- **Rhythm:** Spacing follows a 4px base unit. Generous vertical "Stack" spacing (80px+) is used between major sections to emphasize exclusivity and focus. 
- **Borders:** Use thin, 1px horizontal lines in `#E5E5E5` to separate content, replacing the need for shadows or cards.

## Elevation & Depth

This design system eschews shadows entirely. Depth is communicated through **Tonal Layering** and **Line Work**.

1.  **Level 0 (Base):** Gallery White (#FFFFFF).
2.  **Level 1 (Sub-navigation/Search):** Soft Stone (#F9F8F6).
3.  **Level 2 (Modals/Overlays):** Gallery White with a 1px Architectural Charcoal border.

Instead of traditional elevation, use "Ghost Layers" where content overlaps imagery with 0.5pt borders. This maintains the 2D architectural drawing aesthetic. Interactive elements shift in tone (e.g., from Charcoal to Deep Walnut) rather than moving "closer" to the user.

## Shapes

The shape language is **Sharp**. Architectural precision is achieved through 90-degree angles. 

- **Buttons & Inputs:** Must have 0px radius. 
- **Product Imagery:** Should always be square or 4:5 aspect ratio with sharp corners.
- **Exceptions:** Very small UI icons may use a 2px "Soft" radius if strictly necessary for legibility, but all structural containers remain sharp.

## Components

### Buttons
- **Primary:** Solid Architectural Charcoal background, white text, sharp edges. No hover shadow; instead, use a slight opacity shift or a transition to Deep Walnut.
- **Secondary:** Transparent background, 1px Charcoal border.
- **Tertiary:** Text-only with a 1px underline that expands on hover.

### Inputs & Fields
- Bottom-border only for a cleaner, "form-style" look in editorial contexts. 
- In dashboards, use full 1px borders in `muted-line` (#E5E5E5). 
- Labels always use `label-caps` typography, positioned above the field.

### Cards
- No background or shadow.
- A card consists of a sharp-edged image, followed by a `label-caps` category, and a `headline-md` title.
- Use a 1px divider between card rows in list views.

### Chips & Tags
- Rectangular with sharp edges. 
- Soft Stone background with Charcoal text. Minimal padding.

### Seller Storefronts
- Consistent structural grid, but allows for a "Hero" image area and custom "Curator's Note" using Playfair Display Italic to provide a personalized, high-end boutique feel.