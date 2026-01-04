# Styling Conventions (Frontend)

Purpose: keep the UI consistent, predictable, and easy to maintain. Use these rules in all new or refactored components.

## Framework selection
- **Bootstrap**: use for layout scaffolding (grid, spacing utilities), typography, simple forms, and standard components already established in the codebase.
- **Tailwind**: use for highly custom layouts, fine-grained spacing, and bespoke interactions where Bootstrap would require heavy overrides.
- **Do not mix Bootstrap and Tailwind in the same component.** Pick one per component to avoid conflicting resets and debugging churn.

## Component patterns
- **Drawers/Overlays**: prefer Tailwind for positioning, layering, and transitions; keep z-index tokens consistent; disable page scroll while open; include ESC/overlay click to close; ensure focus trapping and return focus on close.
- **Data views (tables, lists, timelines)**: default to Bootstrap table/list patterns for consistency; when dense custom layouts are needed (virtualized lists, timelines), use Tailwind but keep typography and spacing tokens aligned with the design scale.
- **Navigation (sidebars, top bars, tabs)**: use Bootstrap nav patterns for standard navigation; use Tailwind only when creating bespoke navigation experiences; maintain accessible roles/aria and focus states.

## Spacing, colors, and typography
- Reuse existing design tokens (spacing scale, color variables) regardless of framework choice; avoid inline magic numbers.
- Keep hover/active/focus states visible and consistent; ensure contrast meets accessibility guidelines.

## Misc
- Keep component-level styles co-located; avoid global overrides unless necessary.
- Prefer utility classes or small, targeted CSS over sprawling custom stylesheets.
