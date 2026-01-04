# Architectural Layers Summary

This document provides a high-level overview of all architectural layers implemented in the silsilah project.

## Layer Stack

### Layer 1: Boundary Hardening ✅ Complete
**Goal**: Centralize authorization and freeze DTOs  
**Implementation**:
- `AuthorizationPolicy` class for centralized auth gates
- Frozen (readonly) DTOs at type level
- Cleaner separation between presentation and application

**Status**: Production  
**Reference**: [AUTHORIZATION.md](../backend/AUTHORIZATION.md)

---

### Layer 2: Visualization Isolation ✅ Complete
**Goal**: Strict separation between API DTOs and rendering logic  
**Implementation**:
- `RenderDataAdapter` as single transformation entry point
- No renderer imports DTOs directly
- Pure view models (TreeViewModel, HierarchyViewModel)
- API DTO → Adapter → ViewModel → Renderer (unidirectional flow)

**Status**: Production  
**Reference**: [frontend/src/adapters/renderDataAdapter.ts](../frontend/src/adapters/renderDataAdapter.ts)

---

### Layer 3: Write Path Consolidation ✅ Complete
**Goal**: Single entry point for all mutations  
**Implementation**:
- `GenealogyCommandBus` with intention-revealing command functions
- Typed request payloads (AddPersonCommand, UpdateTreeCommand, etc.)
- Centralized error handling and parsing
- CommandResult<T> response wrapper

**Command Mutations**:
- `addPerson()` - Create person
- `addParentChildRelationship()` - Establish parent-child link
- `addSpouseRelationship()` - Establish spouse link
- `updatePerson()` - Update person attributes
- `deletePerson()` - Delete person with cascade options
- `updateTree()` - Update tree metadata
- `deleteTree()` - Delete entire tree
- `createTree()` - Create new tree
- `duplicateTree()` - Clone existing tree

**Status**: Production  
**Reference**: [frontend/src/commands/genealogyCommands.ts](../frontend/src/commands/genealogyCommands.ts)

---

### Layer 4: Styling Strategy Freeze ✅ Complete
**Goal**: Prevent CSS framework mixing and enforce consistency  
**Implementation**:
- **Bootstrap**: Structure + data display (forms, tables, modals, lists)
- **Tailwind**: Interactive overlays, custom effects, fine-grained utilities
- **Ban**: Mixing both frameworks in single component
- **Pattern**: Composite delegation for complex UIs

**Policy Documents**:
- [STYLING_STRATEGY.md](./STYLING_STRATEGY.md) - Full policy with rationale
- [STYLING_QUICK_REFERENCE.md](./STYLING_QUICK_REFERENCE.md) - Quick decision guide
- [frontend/eslint-styling-rules.js](../frontend/eslint-styling-rules.js) - Enforcement rules (future automated)

**Utility Module**:
- [frontend/src/utils/stylingPolicy.ts](../frontend/src/utils/stylingPolicy.ts) - Policy helpers and registries

**Component Framework Mapping**:
- Bootstrap: TreeList, TreeSettingsPage, CreateTreeModal, PersonForm, EditPersonDrawer, etc.
- Tailwind: HierarchicalTreeCanvas, TimelineView, KeyboardHintsPanel, etc.
- Composite: TreeViewer, RelationshipManager, PersonDetailsDrawer (delegates to subcomponents)

**Status**: Policy Active  
**Enforcement**: Code review (future: automated ESLint)

---

## Complete Architectural Map

```
Frontend
├─ Layer 1: Read Path
│  ├─ API Call
│  ├─ RenderDataAdapter
│  ├─ TreeViewModel
│  └─ Renderer Components
│
├─ Layer 2: Hierarchy Path
│  ├─ API Call (same DTO)
│  ├─ RenderDataAdapter.buildHierarchyModel()
│  ├─ HierarchyViewModel
│  └─ HierarchicalTreeCanvas
│
├─ Layer 3: Write Path
│  ├─ Component UI Handler
│  ├─ GenealogyCommandBus.command()
│  ├─ API Call
│  └─ CommandResult<T> Response
│
└─ Layer 4: Styling
   ├─ Bootstrap Components (structure + display)
   ├─ Tailwind Components (interactive + overlay)
   └─ Composite Pattern (delegation when needed)

Backend
├─ Authorization Policy (Layer 1 equivalent)
├─ Domain Model
├─ Application Services
└─ Presentation Controllers
```

## Cross-Cutting Concerns

### Error Handling
- Centralized in GenealogyCommandBus.parseApiError()
- Domain-specific messages (cycle detection, age constraints, etc.)
- User-friendly error display in components

### Type Safety
- Frozen DTOs (readonly)
- Typed command payloads
- Typed response wrappers
- TypeScript compilation prevents mixing

### Code Organization
- `src/components/` - React components
- `src/adapters/` - Data transformation
- `src/commands/` - Mutations entry point
- `src/utils/` - Helpers (genealogyHierarchy, stylingPolicy, etc.)
- `src/api.ts` - API calls (read + write)

## Benefits Realized

| Layer | Benefit | Impact |
|-------|---------|--------|
| Layer 1 | Centralized auth | Easier to audit security, add new roles |
| Layer 2 | API isolation | Renderers never depend on API changes |
| Layer 3 | Mutation consolidation | Single point for logging, validation, error handling |
| Layer 4 | Styling consistency | Reduced CSS debt, easier to maintain, clearer decisions |

## Next Steps (Future Layers)

Potential future layers (out of scope for current work):

1. **Layer 5: Caching Strategy** - QueryClient/React Query for data consistency
2. **Layer 6: Real-time Sync** - WebSocket/subscription pattern for collaboration
3. **Layer 7: Performance Boundaries** - Memoization and render optimization policy
4. **Layer 8: Testing Strategy** - Unit, integration, E2E testing boundaries

---

## Quick Links

- [Backend Authorization](../backend/AUTHORIZATION.md)
- [Frontend Styling Strategy](./STYLING_STRATEGY.md)
- [Styling Quick Reference](./STYLING_QUICK_REFERENCE.md)
- [Genealogy Commands](../frontend/src/commands/genealogyCommands.ts)
- [Render Data Adapter](../frontend/src/adapters/renderDataAdapter.ts)

---

**Last Updated**: December 28, 2025  
**Status**: Layer 4 Active, Enforced
