---
name: Architectural Quiet Luxury
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
  secondary: '#5e5e5f'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdf'
  on-secondary-container: '#626263'
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
  tertiary-fixed: '#e3e2e2'
  tertiary-fixed-dim: '#c7c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#464747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.3'
  display-sm:
    fontFamily: Playfair Display
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
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
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
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
  margin-mobile: 20px
  margin-desktop: 64px
  max-width-content: 1100px
  form-gap: 32px
---

## Brand & Style
The design system is rooted in the philosophy of "Quiet Luxury"—a movement that prioritizes material quality, spatial harmony, and understated confidence over loud branding. For the checkout experience of The Guild, the UI functions as a digital gallery: a neutral, high-end container that recedes to let the transaction feel effortless and secure.

The aesthetic combines **Minimalism** with **Architectural** precision. It utilizes heavy whitespace to reduce cognitive load during the payment process, creating a "calm commerce" environment. Every element is intentional, avoiding unnecessary decoration in favor of structural clarity and typographic excellence. The emotional response is one of total composure and institutional trust.

## Colors
The palette is monochromatic and sophisticated, utilizing "Warm Ivory" (#FBF9F9) as the primary canvas to avoid the clinical feel of pure white. 

- **Primary (Architectural Charcoal):** Used for all high-level communication, headings, and primary action states.
- **Secondary (Warm Ivory):** The foundational background color for pages and containers.
- **Tertiary (Muted Silver):** Reserved for secondary information and disabled states.
- **Neutral (Structural Gray):** Used exclusively for hairline borders and separators.

The contrast ratio is strictly maintained for accessibility while ensuring the "gallery" feel remains intact. Accents are avoided to maintain a focused, distraction-free checkout funnel.

## Typography
The typographic system employs a classic serif/sans-serif pairing to distinguish between narrative and function.

**Playfair Display** is used for headlines, step titles, and price totals. Its high-contrast strokes evoke the editorial quality of a luxury fashion journal. **Hanken Grotesk** serves as the functional workhorse for form fields, labels, and fine print; its contemporary geometry ensures maximum legibility at small sizes.

Uppercase styling is applied to labels and buttons to create a sense of formal structure. Line heights are generous throughout to maintain the airy, architectural feel.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy for desktop to maintain the "gallery" look, centered within the viewport. 

- **Desktop (1440px+):** A 12-column grid with 64px outer margins. The checkout form occupies the central 6 columns or a split 50/50 view with the order summary.
- **Tablet (768px - 1024px):** An 8-column grid with 40px margins.
- **Mobile (<768px):** A 4-column fluid grid. Content stacks vertically, and margins reduce to 20px.

Spacing is based on a 4px baseline, but the "Quiet Luxury" aesthetic demands large-scale breathing room. Section padding should default to 80px - 120px on desktop to create a sense of exclusivity and importance.

## Elevation & Depth
This design system avoids heavy drop shadows in favor of **Structural Tiers** and **Low-Contrast Outlines**.

Depth is created through:
1.  **Layering:** The base is Warm Ivory (#FBF9F9). Cards or "Step Containers" use a 1px solid border of Structural Gray (#E5E5E5).
2.  **Subtle Shadows:** If a shadow is required for a floating element (like a dropdown), use an ultra-diffused, 4% opacity Architectural Charcoal tint with a 20px blur and 0px offset.
3.  **Active Focus:** Form fields do not use "glow" effects. On focus, the 1px border transitions from Neutral to Primary Charcoal (#1A1A1A) with a crisp, 0ms transition.

## Shapes
The shape language is "Soft" yet precise. A **4px corner radius** (defined as `rounded-sm`) is applied to all interactive elements—buttons, inputs, and containers. This slight softening prevents the UI from feeling sharp and aggressive while maintaining a tailored, architectural silhouette. 

Do not use fully rounded "pill" shapes, as they contradict the structured, gallery-like narrative.

## Components
- **Buttons:** Primary buttons are solid Architectural Charcoal with white text, using `label-md` typography. Secondary buttons are transparent with a 1px border. No gradients.
- **Input Fields:** Minimalist design with a 1px bottom border only, or a full 1px light border. Labels sit above the input in `label-sm` uppercase.
- **Step Navigation:** A horizontal "thread" at the top of the page. Completed steps are marked with a simple 1px Charcoal checkmark; active steps are bolded.
- **Cards/Containers:** Used for order summaries. They should have a 1px border (#E5E5E5) and no shadow. Padding inside cards is a generous 32px.
- **Payment States:** Use a distinctive "Secure Transition" animation—a subtle fade-in of the payment verification state to maintain a calm atmosphere.
- **Checkboxes/Radios:** Custom-styled as small 16px squares (checkboxes) or circles (radios) with a 1px Charcoal stroke. The "selected" state is a solid Charcoal fill with a 4px inset.