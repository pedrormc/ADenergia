# Design System Strategy: Solar Intelligence & Editorial Depth

## 1. Overview & Creative North Star
The solar energy sector is often crowded with generic green-and-white templates. This design system departs from that utility-first aesthetic to embrace **"The Luminous Editor."** 

Our Creative North Star treats data not as a chore to be monitored, but as a premium story to be curated. By blending the high-contrast authority of editorial typography with a sophisticated layering system, we create a dashboard that feels like a high-end financial journal for the clean-tech era. We break the "standard dashboard" mold through **intentional asymmetry**, using large-scale display type and overlapping "glass" containers that mimic the way light reflects off a silicon solar cell.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep, authoritative blues and high-energy yellows, balanced by an expansive range of "cool" neutrals.

### The "No-Line" Rule
**Borders are prohibited for sectioning.** To achieve a high-end feel, boundaries must be defined solely through background color shifts. For example, a `surface-container-low` component should sit on a `surface` background. If you feel the need for a line, you have failed the layout; use white space or a tonal shift instead.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-translucent materials.
- **Surface (Base):** `#faf8ff` - The canvas.
- **Surface-Container-Low:** `#f4f3fa` - Secondary content areas.
- **Surface-Container-Highest:** `#e2e2e9` - Interactive cards or active states.
- **The Glass & Gradient Rule:** For floating metrics or hero highlights, use a backdrop-blur (12px–20px) with a semi-transparent `surface` color. 
- **Signature Texture:** Primary CTAs should not be flat blue. Use a subtle linear gradient from `primary` (#001f56) to `primary_container` (#003282) at a 135-degree angle to provide "soul" and depth.

---

## 3. Typography
We use a dual-font strategy to balance technological precision with human-centric authority.

*   **Display & Headlines (Manrope):** A modern geometric sans-serif. Use `display-lg` (3.5rem) for big-picture metrics (e.g., total energy generated). The tight tracking and bold weights convey the "Clean Tech" brand power.
*   **Body & Labels (Inter):** The workhorse of high-end UI. Its high x-height ensures readability in complex data tables.
*   **Editorial Scale:** We utilize extreme contrast between `display-sm` for hero numbers and `label-sm` for metadata. This "big/small" relationship is a hallmark of premium editorial design.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structural scaffolding.

*   **The Layering Principle:** Stack `surface-container-lowest` cards on a `surface-container-low` background. This creates a "soft lift" that feels architectural rather than digital.
*   **Ambient Shadows:** Floating elements (like Tooltips or Modals) must use an extra-diffused shadow. 
    *   *Spec:* `0px 20px 40px rgba(26, 27, 33, 0.06)` (A tint of `on_surface`). Avoid generic black/grey shadows.
*   **The "Ghost Border" Fallback:** If a boundary is strictly required for accessibility, use `outline_variant` at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism:** Use `surface_bright` at 70% opacity with a `backdrop-filter: blur(10px)` for navigation rails to allow the dashboard's data visualizations to peek through the UI.

---

## 5. Components

### Buttons
- **Primary:** Gradient (`primary` to `primary_container`), `roundness-md`, white text. No shadow.
- **Secondary:** `surface_container_highest` background with `primary` text.
- **Tertiary:** Ghost style; text only with `primary` color. Underline only on hover.

### Cards & Metrics
- **The Dashboard Card:** Use `surface_container_lowest`. Forbid divider lines. Use `spacing-8` (2rem) of internal padding.
- **Metric Highlighters:** Use `secondary_container` (Yellow) for the most critical "Positive Impact" data points to draw the eye immediately.

### Input Fields
- **Default State:** `surface_container_low` background with a `ghost-border` (10% opacity).
- **Focus State:** Background shifts to `surface_container_lowest`, and a 2px `primary` bottom-border (not a full ring) is added.

### Solar-Specific Components
- **The "Energy Flow" List:** Instead of dividers, use a `surface-container-high` strip that spans 100% of the container width behind the active list item.
- **Status Chips:** `tertiary_fixed` (Green) for "Generating" and `error_container` for "System Fault," using `label-md` uppercase typography.

---

## 6. Do's and Don'ts

### Do:
- **Use Large Asymmetrical Gaps:** Let the layout breathe with `spacing-12` or `spacing-16` between major sections.
- **Embrace "Big Type":** Make your primary generation number the hero of the screen using `display-lg`.
- **Layer with Intent:** Ensure every nested container moves one step higher or lower in the `surface-container` scale.

### Don't:
- **No 1px Lines:** Do not use dividers to separate data rows. Use background color alternates or vertical spacing.
- **No Heavy Shadows:** Never use a shadow with more than 10% opacity. If the depth isn't clear, adjust the surface color instead.
- **No Default Blue:** Avoid using `primary` for large background areas; it is too heavy. Keep it for CTAs, icons, and text accents.
- **No Sharp Corners:** Every element must respect the `roundness` scale, with `md` (0.75rem) being the standard for cards to soften the "industrial" feel of solar data.