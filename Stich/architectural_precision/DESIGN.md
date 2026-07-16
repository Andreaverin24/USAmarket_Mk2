---
name: Architectural Precision
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  data-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 32px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built for high-stakes operational management. It adopts a **Minimalist Architectural** style, prioritizing structural clarity, data density, and functional authority. The visual language is inspired by blueprints and editorial catalogs—clean, intentional, and devoid of unnecessary decoration.

The target audience consists of administrators and operators who require a "heads-up display" of complex information. The emotional response is one of **calculated trust and precision**. Every element is placed with purpose, using whitespace not just as a breather, but as a structural separator to ensure readability in data-heavy environments.

## Colors

The palette is restrained and high-contrast, designed to highlight information over interface.
- **Primary (Deep Navy):** Reserved for primary actions, active states, and structural navigation. It communicates stability and depth.
- **Neutral/Surface:** Pure white (#FFFFFF) is the primary canvas to maximize contrast. Architectural Charcoal (#1E293B) is used for typography to ensure maximum legibility without the harshness of pure black.
- **Semantic Accents:** Used sparingly. Amber is utilized for operational "holds" or pending states, while a soft but authoritative red is reserved strictly for incidents and critical exceptions.
- **Tints:** Low-saturation grays are used for borders and secondary data labels to maintain the architectural "line-work" feel.

## Typography

The typographic strategy creates a tension between brand heritage and functional utility. 
- **Headlines:** Playfair Display is used for page titles and major section headers, grounding the dashboard in the brand's sophisticated editorial roots.
- **UI & Data:** Inter is the workhorse font. It provides high legibility at small sizes. 
- **Data Tables:** For numerical data, use tabular figures (`tnum`) to ensure columns of numbers align vertically for quick scanning.
- **Labels:** Small labels use uppercase with slight letter spacing to differentiate them from body text and emphasize their role as metadata.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Navigation and sidebars are fixed to specific widths to ensure consistent control placement, while the main content area scales to accommodate dense data tables.

- **Grid:** A 12-column grid is used for dashboard widgets.
- **Density:** High. Margins and gutters are kept tight (16px) to maximize the "above the fold" information display.
- **Alignment:** Strict adherence to a 4px baseline grid. All elements should align to this vertical rhythm to maintain the architectural feel.
- **Breakpoints:**
  - Desktop: 1440px+ (Full 12-column span)
  - Tablet: 768px - 1024px (Cards stack into 2 columns, sidebar collapses to icons)
  - Mobile: Under 768px (Single column, navigation moves to a top-level drawer)

## Elevation & Depth

This design system avoids heavy shadows and traditional depth metaphors. Instead, it uses **Low-contrast Outlines** and **Tonal Layers** to create hierarchy.

- **Layering:** The base background is slightly off-white (#F8FAFC). Primary content containers (cards, panels) are pure white (#FFFFFF) with a 1px border in a light charcoal tint.
- **Borders:** Borders are the primary tool for separation. They should be crisp, 1px wide, and use `#E2E8F0`.
- **Active State Elevation:** Only when an element is "picked up" or dragged should a subtle, sharp shadow be used (e.g., 4px offset, 8px blur, 0.05 opacity). Otherwise, the UI remains flat and structural.

## Shapes

To reinforce the **Architectural** pillar, shapes are characterized by sharp, clean angles.
- **Base Radius:** 2px for small components (checkboxes, tags).
- **Component Radius:** 4px for larger components (buttons, input fields, cards).
- **Strictness:** Circular elements are forbidden unless used for user avatars. All structural elements must remain rectangular to maintain the "blueprint" aesthetic.

## Components

- **Buttons:** Primary buttons are solid Deep Navy with white text. Secondary buttons are outlined with 1px Architectural Charcoal. Transitions should be instant (no-ease or very fast) to feel precise.
- **Input Fields:** Use 1px borders. Focus states are indicated by a 2px interior border in Deep Navy, never a soft glow.
- **Data Tables:** The core of the dashboard. Use zebra-striping with a very faint gray (#F1F5F9). Headers are uppercase Inter with a bottom border.
- **Chips/Tags:** Rectangular with 2px radius. Use light background tints of the semantic colors (e.g., light amber background with dark amber text).
- **Cards:** No shadows. Defined by a 1px border (#E2E8F0). Header sections within cards should be separated by a horizontal rule.
- **Status Indicators:** Use a "Dot + Label" pattern. A 6px square (not a circle) next to the text label represents the status.