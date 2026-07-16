---
name: Architectural Excellence
colors:
  surface: '#fbf9f3'
  surface-dim: '#dcdad4'
  surface-bright: '#fbf9f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee8'
  surface-container-high: '#eae8e2'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#444748'
  inverse-surface: '#30312d'
  inverse-on-surface: '#f2f1eb'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c8c6c5'
  secondary: '#715a3e'
  on-secondary: '#ffffff'
  secondary-container: '#fdddb9'
  on-secondary-container: '#786044'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#151e10'
  on-tertiary-container: '#7d8774'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#fdddb9'
  secondary-fixed-dim: '#e0c29f'
  on-secondary-fixed: '#281803'
  on-secondary-fixed-variant: '#584329'
  tertiary-fixed: '#dce6d0'
  tertiary-fixed-dim: '#c0cab4'
  on-tertiary-fixed: '#151e10'
  on-tertiary-fixed-variant: '#404a39'
  background: '#fbf9f3'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
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
    lineHeight: '1.4'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.03em
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style

The design system is rooted in the principles of architectural precision and high-fidelity craftsmanship. It targets a sophisticated audience that values detail, permanence, and clarity. The brand personality is authoritative yet welcoming—evoking the feeling of a high-end atelier or a curated gallery.

The visual style is **High-End Minimalism**. It prioritizes structural integrity over decorative flair, utilizing generous whitespace to allow content to breathe. The aesthetic balances the warmth of organic materials (Ivory) with the rigor of modern construction (Charcoal), resulting in a UI that feels both grounded and aspirational.

## Colors

The palette is inspired by natural, architectural materials. 

- **Surface (Ivory):** The primary canvas. It provides a warmer, more premium feel than pure white, reducing eye strain and suggesting high-quality paper or limestone.
- **Text (Charcoal):** Used for all primary communication to ensure maximum legibility and a sense of "ink on paper."
- **Accents (Bronze & Sage):** Bronze (#8C7355) is reserved for interactive states, call-to-actions, and premium status markers. Sage (#7A8471) is used for secondary indicators, such as "in-progress" steps or environmental features.
- **Borders:** Extremely thin and subtle, using low-opacity Charcoal to maintain structure without cluttering the visual field.

## Typography

This design system utilizes a high-contrast typographic pairing to reinforce the architectural narrative.

- **Headlines:** *Playfair Display* brings a literary, editorial quality. It should be used for page titles and major section headers. Large display sizes benefit from slight negative letter-spacing to appear more "locked-in."
- **UI & Body:** *Hanken Grotesk* offers a precise, contemporary sans-serif counterpart. It is engineered for legibility at small sizes. 
- **Labels:** Use uppercase for labels with increased letter-spacing to create a sense of professional organization and "drafting" aesthetics.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for desktop to maintain the "curated" look of a physical portfolio. On smaller screens, it transitions to a fluid model with generous side margins.

- **The 8px Rule:** All spacing and sizing must be multiples of 8px to ensure mathematical harmony.
- **Vertical Rhythm:** Use large gaps (64px+) between major sections to define the hierarchy through whitespace rather than lines.
- **Grid:** A 12-column grid is used for desktop. For the Buyer Account area, content should typically occupy the central 8 or 10 columns to avoid excessive line lengths in text-heavy areas.

## Elevation & Depth

This design system avoids heavy shadows, instead relying on **Tonal Layering** and **Structural Outlines**.

- **Surfaces:** Depth is created by placing slightly darker Ivory (#F2F0E9) containers against the primary surface (#FBF9F3).
- **Outlines:** Use 1px solid borders in a very faint Charcoal (10% opacity) to define cards and input fields.
- **Elevation:** Only the most critical interactive elements (like a primary modal or a hovering dropdown) should use a shadow. If used, the shadow should be an "Ambient Shadow": very large blur (32px+), extremely low opacity (4-6%), and tinted with the Primary Charcoal color to avoid a "grey" look.

## Shapes

The shape language is **Sharp**. Consistent with architectural drawings and blueprints, the design system uses 0px corner radii for almost all elements.

- **Right Angles:** Buttons, input fields, and cards must have sharp corners to convey a sense of strength and precision.
- **Exceptions:** Status dots or small notification pips may be circular to provide a soft visual counterpoint to the otherwise rigid geometry.

## Components

### Buttons
Primary buttons are solid Charcoal with Ivory text. Secondary buttons are outlined in 1px Charcoal with no fill. Interaction states involve a subtle background shift to the Bronze accent. All buttons use the sharp corner radius.

### Input Fields
Inputs are minimal: a bottom-border only or a very light 4-sided stroke. Labels are positioned above the field in uppercase `label-md`. Focus states are indicated by a thickening of the bottom border in Bronze.

### High-Fidelity Timelines
For tracking architectural progress or purchase milestones, timelines use a vertical or horizontal axis of 1px Charcoal. Completed steps use the Sage accent, while the "Current" step is highlighted in Bronze.

### Status Indicators
Status chips are not filled; they consist of a small colored dot (Bronze, Sage, or Charcoal) followed by `label-sm` text. This maintains the clean, "ink-on-paper" aesthetic.

### Cards
Cards are defined by a 1px `border_color` stroke. They do not have shadows. Header areas within cards should be separated by a light horizontal rule to maintain the feeling of a structured document.