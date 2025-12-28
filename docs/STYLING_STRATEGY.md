# Styling Strategy Freeze

## Overview

This document freezes the frontend styling architecture to prevent technical debt from CSS framework mixing. All components must follow explicit rules about which framework to use for each UI concern.

**Effective Date**: December 28, 2025  
**Applies To**: All React components in `frontend/src/components/`  
**Status**: POLICY (non-negotiable without architectural review)

---

## The Policy

### Rule 1: Framework Assignment

**Bootstrap** is for:
- Page structure and layout (containers, grids, rows, cols)
- Data display tables and lists
- Modal dialogs (offcanvas, modal components)
- Form elements with standard styling
- Standard buttons with semantic colors (primary, danger, success)
- Alerts, badges, spinners
- Navigation components (navbar, breadcrumbs)

**Tailwind** is for:
- Drawer overlays (interactive sidebars)
- Custom overlay patterns
- Interactive UI polish (hover states, transitions, shadows)
- Custom spacing and margin adjustments
- Responsive breakpoint utilities
- Fine-grained visual effects

### Rule 2: No Framework Mixing in Single Component

**FORBIDDEN**: Using both Bootstrap classes AND Tailwind classes in the same `.tsx` file.

```typescript
// ❌ FORBIDDEN
export const BadExample: React.FC = () => (
  <div className="container p-4">  {/* Bootstrap container */}
    <div className="fixed inset-0 bg-black/50">  {/* Tailwind overlay */}
      <button className="btn btn-primary">  {/* Bootstrap button */}
        Styled with <span className="text-sm">Tailwind</span>  {/* Tailwind text */}
      </button>
    </div>
  </div>
);
```

**ALLOWED**: Pure Bootstrap component

```typescript
// ✅ ALLOWED: Pure Bootstrap
export const BootstrapForm: React.FC = () => (
  <div className="container mt-4">
    <form>
      <div className="mb-3">
        <label className="form-label">Name</label>
        <input type="text" className="form-control" />
      </div>
      <button className="btn btn-primary">Submit</button>
    </form>
  </div>
);
```

**ALLOWED**: Pure Tailwind component

```typescript
// ✅ ALLOWED: Pure Tailwind
export const TailwindDrawer: React.FC = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <input 
        type="text" 
        className="w-full px-3 py-2 border border-gray-300 rounded"
      />
    </div>
  </div>
);
```

**ALLOWED**: Delegating styling to separate subcomponents

```typescript
// ✅ ALLOWED: Delegation
export const SmartComposite: React.FC = () => (
  <div className="container">  {/* Bootstrap: structure */}
    <BootstrapTable />          {/* Pure Bootstrap component */}
    <TailwindOverlay />         {/* Pure Tailwind component */}
  </div>
);
```

---

## Rationale

### Why This Split?

1. **Bootstrap Strengths**
   - Built-in semantic form components
   - Consistent data display patterns
   - Battle-tested modal/dialog system
   - Excellent accessibility defaults

2. **Tailwind Strengths**
   - Granular spacing and sizing
   - Fine-grained opacity/color utilities
   - Perfect for custom overlay patterns
   - Excellent for interactive polish

### Why No Mixing?

1. **CSS Conflict Risk**: Class name collisions create unpredictable cascades
2. **Maintenance Burden**: Unclear which framework owns which style
3. **Bundle Size**: Mixing increases CSS output (duplication)
4. **Developer Cognitive Load**: Contributors can't quickly identify which utilities apply
5. **Testing Complexity**: Harder to debug style issues when frameworks overlap

---

## Component Categories

### Bootstrap Components (Pure Bootstrap Only)

- `TreeList.tsx` — List of family trees
- `TreeSettingsPage.tsx` — Form-based settings
- `ExportModal.tsx` — Standard modal
- `ImportModal.tsx` — Standard modal with file upload
- `CreateTreeModal.tsx` — Form modal
- `PersonForm.tsx` — Form with validation
- `AddPersonDrawer.tsx` — Offcanvas form
- `EditPersonDrawer.tsx` — Offcanvas editor
- `StatisticsSidebar.tsx` — Stats display in sidebar (if using tables)
- `MergeDialog.tsx` — Modal dialog

### Tailwind Components (Pure Tailwind Only)

- `HierarchicalTreeCanvas.tsx` — Overlay with D3 rendering
- `TimelineView.tsx` — Custom timeline visualization
- `RangeSlider.tsx` — Custom interactive control (if exists)
- `KeyboardHintsPanel.tsx` — Floating hints overlay
- `CompactActivityFeed.tsx` — Custom scrollable overlay

### Composite Components (Multi-Framework Delegation)

- `TreeViewer.tsx` — Main view combining Bootstrap layout + Tailwind overlays
  - Uses Bootstrap for: page structure, toolbar, sidebar layout
  - Delegates to Tailwind components for: visualization overlays
- `RelationshipManager.tsx` — Bootstrap form + optional overlays
  - Uses Bootstrap for: form controls
  - Delegates to custom rendering if needed
- `PersonDetailsDrawer.tsx` — Mixed pattern
  - Uses Bootstrap for: modal/offcanvas wrapper
  - Could use Tailwind for: custom content inside

---

## Migration Checklist

When converting existing components:

- [ ] Audit current component for mixed classes
- [ ] Identify primary purpose (structure/display vs. interactive/overlay)
- [ ] Choose dominant framework
- [ ] Remove all other framework classes
- [ ] If mixed, delegate to subcomponents
- [ ] Update import: remove unused Tailwind/Bootstrap if possible
- [ ] Test responsive behavior
- [ ] Verify accessibility with screen reader

---

## ESLint Rules (Future Enhancement)

Once enforceable through tooling, implement:

```javascript
// .eslintrc.cjs addition (example)
{
  "rules": {
    "no-mixed-css-frameworks": "error"  // Hypothetical rule
  }
}
```

**Current Enforcement**: Code review and this document (manual).

---

## Examples by Component Type

### Data Display (Bootstrap)

```typescript
// ✅ CORRECT
export const PersonTable: React.FC = () => (
  <div className="table-responsive">
    <table className="table table-hover">
      <tbody>
        <tr><td>John Doe</td><td>1950</td></tr>
      </tbody>
    </table>
  </div>
);
```

### Interactive Overlay (Tailwind)

```typescript
// ✅ CORRECT
export const HierarchyOverlay: React.FC = () => (
  <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
    <canvas className="w-full h-full" />
  </div>
);
```

### Composite (Delegation)

```typescript
// ✅ CORRECT
export const ComplexView: React.FC = () => (
  <div className="container mt-4">              {/* Bootstrap: structure */}
    <div className="row">
      <div className="col-md-8">
        <BootstrapDataTable data={data} />      {/* Pure Bootstrap child */}
      </div>
      <div className="col-md-4">
        <TailwindVisualization />                {/* Pure Tailwind child */}
      </div>
    </div>
  </div>
);
```

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-28 | Bootstrap for structure, Tailwind for overlays | Leverages each framework's strengths |
| 2025-12-28 | Explicit ban on mixing in single file | Reduces CSS conflicts and cognitive load |
| 2025-12-28 | Delegation pattern for complex UIs | Enables both frameworks without mixing |

---

## Questions & Answers

**Q: What if my component needs both structure AND custom overlay?**  
A: Create subcomponents. Parent uses Bootstrap, child uses Tailwind. No mixing in single file.

**Q: Can I use Tailwind spacing in Bootstrap components?**  
A: No. Choose Bootstrap or Tailwind as your primary framework and use only its utilities.

**Q: What about forms with custom inputs?**  
A: Use Bootstrap form controls with custom styling via Bootstrap utility classes only.

**Q: Is this enforced by the build system?**  
A: Currently: Code review. Future: ESLint rules.

---

## Future Enhancements

1. **Automated Detection**: Implement ESLint rule to catch mixing
2. **CSS Audit Tool**: Generate report of mixing violations
3. **Tailwind Config**: Restrict to specific component files
4. **Bootstrap Customization**: Override theme to match Tailwind palette in Tailwind-heavy areas

---

## References

- [Bootstrap Documentation](https://getbootstrap.com/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [CSS Framework Comparison](https://css-tricks.com/frameworks/)
