---
name: Architectural Commerce
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#444748'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626262'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#e4e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-bold:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-xs: 4px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built for high-stakes B2B commerce management, where operational efficiency meets executive prestige. The brand personality is **authoritative, precise, and sophisticated**. It draws heavily from **Minimalism** and **Architectural** design principles, utilizing structured grids, ample whitespace, and high-contrast typography to create a "Guild" aesthetic that feels both traditional and technologically advanced.

The emotional response should be one of total control and clarity. By stripping away decorative clutter and focusing on structural integrity, the UI empowers users to manage complex inventories and financial data without cognitive overload. The style is strictly flat, eschewing shadows for crisp borders and intentional typographic scale.

## Colors

The palette is rooted in **Architectural Charcoal (#1A1A1A)**, used for primary actions, headings, and core text to provide a solid visual anchor. 

- **Surfaces:** Pure white (#FFFFFF) is the primary canvas to maximize readability.
- **Structural Accents:** Soft grey (#E5E5E5) is used for "hairline" borders to define zones without adding visual weight.
- **Functional Accents:** Status colors are desaturated and lean toward "earthy" tones (forest green, deep amber, brick red) to maintain the premium, understated feel rather than looking like a consumer app.
- **Hierarchy:** Primary buttons use the Charcoal base with white text. Secondary actions use subtle grey strokes.

## Typography

The typographic system creates a tension between the **editorial elegance** of Playfair Display and the **utilitarian precision** of Inter.

- **Editorial Headers:** Use Playfair Display for page titles and high-level section headers. This establishes the "Guild" personality.
- **Operational Interface:** Inter is used for all functional elements, including navigation, tables, forms, and data visualization. 
- **Data Density:** For tables and financial figures, use `data-mono` (Inter with tabular lining figures enabled) to ensure vertical alignment of numbers.
- **Labels:** Use `label-bold` in uppercase for table headers and small metadata tags to differentiate them from interactive body text.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for the main content area to maintain a premium "magazine" feel even on ultra-wide monitors. 

- **Grid:** A 12-column grid system with 24px gutters. Content should be centered on screens larger than 1440px.
- **Sidebar:** A fixed 280px navigation sidebar on the left, using a minimal hairline border for separation.
- **Density:** While the headers are spacious, the data areas (tables/forms) use a tight 4px-based rhythm to allow for high information density without sacrificing legibility. 
- **Reflow:** On tablet, the sidebar collapses into a drawer. On mobile, margins reduce to 16px and all grid items stack vertically.

## Elevation & Depth

This design system avoids traditional shadows in favor of **Tonal Layering** and **Architectural Outlines**.

- **Level 0 (Base):** Light grey background (#F9F9F9) for the overall application frame.
- **Level 1 (Surface):** Pure white (#FFFFFF) cards or containers for content, defined by 1px solid borders (#E5E5E5).
- **Level 2 (Interaction):** Hover states use a very subtle fill change (#F5F5F5) rather than a shadow.
- **Visual Depth:** Depth is created through the overlap of lines and high-contrast text rather than blur. Modals are the only exception, utilizing a high-contrast charcoal border and a dim, neutral overlay (30% opacity black) to isolate the focus.

## Shapes

The shape language is **disciplined and geometric**. 

A consistent **4px radius** (Soft) is applied to all interactive elements, including buttons, input fields, and cards. This slight rounding softens the "Brutalist" edge while maintaining the "Architectural" precision. 

- **Interactive Elements:** 4px radius.
- **Tags/Chips:** 2px radius (near-sharp) to distinguish them from larger clickable components.
- **Structural Dividers:** 0px radius (sharp lines) used for vertical and horizontal borders between data cells and layout sections.

## Components

### Buttons
- **Primary:** Solid Charcoal (#1A1A1A) background, white text, 4px radius.
- **Secondary:** White background, 1px Charcoal border, Charcoal text.
- **Tertiary:** No border, Charcoal text, subtle grey hover state.

### Input Fields
- **Default:** White background, 1px grey (#E5E5E5) border. On focus, the border thickens to 1px Charcoal.
- **Labels:** Inter Bold, 12px, uppercase, placed above the field with 4px spacing.

### Tables (The Core Dashboard Component)
- **Header Row:** Light grey background (#F5F5F5), hairline bottom border, uppercase labels.
- **Data Rows:** White background, hairline bottom border. High-density padding (8px top/bottom).
- **Numbers:** Tabular lining (monospaced) for easy scanning of prices and quantities.

### Cards
- **Construction:** White background, 1px grey border, 4px radius. No shadow.
- **Header:** Optional 1px bottom border separating the card title (Playfair Display) from the content.

### Status Indicators
- **Chips:** Small, rectangular (2px radius). Text is the dark status color on a 10% opacity background of the same hue (e.g., Dark Green text on light green tint).