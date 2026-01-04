# Styling Strategy Quick Reference

## The Rule in One Sentence
**Choose Bootstrap (structure) OR Tailwind (interactive), never mix in the same file.**

## Decision Tree

```
Does your component need styling?
├─ Structure + Data Display (tables, forms, lists)
│  └─ Use BOOTSTRAP only
├─ Interactive Overlay/Canvas (drawers, popups, custom viz)
│  └─ Use TAILWIND only
└─ Both structure AND interactive?
   └─ Use Composite pattern: parent (Bootstrap) + children (pure Tailwind)
```

## Quick Examples

### ❌ WRONG: Mixed in one component
```tsx
export const BadForm: React.FC = () => (
  <div className="container p-4 hover:bg-gray-50">
    <form>
      <input className="form-control hover:border-blue-500" />
      <button className="btn btn-primary text-white/75">Submit</button>
    </form>
  </div>
);
```

### ✅ RIGHT: Pure Bootstrap
```tsx
export const PersonForm: React.FC = () => (
  <div className="container mt-4">
    <form className="p-3">
      <div className="mb-3">
        <input className="form-control" />
      </div>
      <button className="btn btn-primary">Submit</button>
    </form>
  </div>
);
```

### ✅ RIGHT: Pure Tailwind
```tsx
export const CustomDrawer: React.FC = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center hover:bg-black/75">
    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
      <input className="w-full px-3 py-2 border border-gray-300 rounded hover:border-blue-500" />
      <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Submit
      </button>
    </div>
  </div>
);
```

### ✅ RIGHT: Composite Pattern (delegation)
```tsx
// Parent: Bootstrap structure
export const TreeViewer: React.FC = () => (
  <div className="container-fluid">
    <div className="row">
      <div className="col-md-8">
        <BootstrapDataTable />  {/* Pure Bootstrap */}
      </div>
      <div className="col-md-4">
        <TailwindVisualization />  {/* Pure Tailwind */}
      </div>
    </div>
  </div>
);
```

## Component Checklist

Before submitting a component, verify:

- [ ] Component uses ONLY Bootstrap classes OR ONLY Tailwind classes
- [ ] No `hover:`, `group:`, `peer:` utilities (Tailwind) in Bootstrap component
- [ ] No `btn`, `form-control`, `table` classes (Bootstrap) in Tailwind component
- [ ] If both frameworks needed, split into subcomponents
- [ ] Updated import to remove unused framework imports
- [ ] Tested responsive behavior
- [ ] Verified accessibility

## Common Mistakes to Avoid

| Mistake | Bootstrap | Tailwind | Fix |
|---------|-----------|----------|-----|
| Mixing spacing | `m-3 p-4` | `m-3 p-4` | Use framework-specific: `mt-3 p-3` (Bootstrap) or `mt-3 p-4` (Tailwind) |
| Mixing colors | `text-danger` | `text-red-500` | Pick one framework |
| Mixing hover | `btn` + `hover:bg-blue` | `hover:opacity-75` | Use framework utilities: `hover:` (TW) or Bootstrap state |
| Mixing borders | `form-control` + `border-gray-300` | Avoid mixing | Keep controls from one framework |

## File Structure

```
frontend/src/
├─ components/
│  ├─ Bootstrap/           ← Bootstrap-only components
│  │  ├─ PersonForm.tsx
│  │  ├─ TreeSettingsPage.tsx
│  │  └─ ...
│  ├─ Tailwind/           ← Tailwind-only components
│  │  ├─ HierarchicalTreeCanvas.tsx
│  │  ├─ TimelineView.tsx
│  │  └─ ...
│  ├─ Composite/          ← Delegation pattern components
│  │  ├─ TreeViewer.tsx
│  │  └─ ...
│  └─ shared/            ← Framework-agnostic utilities
├─ utils/
│  └─ stylingPolicy.ts    ← Enforce this policy
└─ styles/
   └─ custom.css          ← Only custom CSS (no mixing!)
```

## Where to Find Framework Classes

**Bootstrap**: https://getbootstrap.com/docs/5.3/  
- Components: buttons, forms, tables, modals, cards, etc.
- Utilities: spacing, sizing, display, colors

**Tailwind**: https://tailwindcss.com/docs/  
- Utilities: complete reference for all utilities
- Plugins: custom plugins and extensions

## Getting Help

1. **Not sure which framework to use?** → Check [STYLING_STRATEGY.md](../docs/STYLING_STRATEGY.md)
2. **Found a mixing violation?** → Refactor using composite pattern
3. **Need a new component type?** → Document the framework choice in code comment
4. **Want to update this policy?** → Create an ADR (Architecture Decision Record)

## Terminology

- **Bootstrap Component**: Uses only `btn-*`, `form-*`, `table*`, `card`, `modal`, `alert`, `row`, `col`, utility classes
- **Tailwind Component**: Uses only `w-*`, `h-*`, `p-*`, `m-*`, `bg-*`, `text-*`, `hover:`, `flex`, `grid`, responsive prefixes
- **Composite Component**: Parent uses one framework, children use appropriate framework
- **Framework Mixing**: Using classes from both frameworks in same file (FORBIDDEN)

## Examples by Component Type

### Form Components (Bootstrap)
- `PersonForm.tsx`
- `AddPersonDrawer.tsx`
- `EditPersonDrawer.tsx`
- `CreateTreeModal.tsx`

### Display Components (Bootstrap)
- `TreeList.tsx`
- `StatisticsSidebar.tsx` (if using tables)
- `PersonDetailsDrawer.tsx` (for Bootstrap modal wrapper)

### Interactive/Canvas Components (Tailwind)
- `HierarchicalTreeCanvas.tsx`
- `TimelineView.tsx`
- `KeyboardHintsPanel.tsx`

### Container Components (Composite)
- `TreeViewer.tsx`
- `RelationshipManager.tsx`

---

**Remember**: Framework consistency = maintainability!
