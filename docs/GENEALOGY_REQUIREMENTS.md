### Frontend Styling Convention

- Drawers and forms: Tailwind CSS utilities
- Layout, lists, and legacy UI: Bootstrap 5 components
- Avoid mixing Tailwind and Bootstrap within a single component. Choose one per component for consistent spacing, typography, and z-index behavior.

Build order: Tailwind stylesheet is loaded first and Bootstrap last (see `frontend/src/main.tsx`). This reduces CSS collisions by letting Bootstrap’s Reboot and variables apply predictably while keeping Tailwind utilities available.

### Add Parent–Child UX (Design)

- Entry points:
   - From Tree Viewer toolbar: a button “Add Relationship → Parent–Child”.
   - From a person’s details drawer: a contextual “Add Parent” or “Add Child” button pre-filling one side.
- UI container: Tailwind drawer (consistent with add-person). Keep it focused: two inputs and validation.
- Selection model:
   - Use the currently loaded `render-data` node list for typeahead search by name and ID.
   - Disallow identical selections (parentId !== childId).
- Validation rules (frontend):
   - Both fields required; prevent duplicate submission; show inline errors.
   - Leave graph constraints (cycles, parent limit, age) to backend; surface its message verbatim.
- Submit flow:
   - Call `POST /trees/:treeId/relationships/parent-child` with `{ parentId, childId }`.
   - On success, refresh render-data and keep the child selected to show new parent edge.
- Error handling:
   - 409/422 mapped to human text: duplicate, cycle detected, or parent limit exceeded.
   - Show raw message string returned by backend beneath the form.

### Command Mapping (Frontend ⇄ Backend)

- Establish Parent–Child
   - Frontend: `establishParentChild(treeId, { parentId, childId })` (see `frontend/src/api.ts`).
   - Backend: `POST /trees/:treeId/relationships/parent-child` handled by `GenealogyController.establishParentChild`.

### Component System Boundaries

- Drawers/forms: Tailwind only
- Layout/navigation/lists: Bootstrap only
- Do not mix within a component. Prefer composition of Tailwind child inside a Bootstrap layout shell.

SOFTWARE REQUIREMENTS SPECIFICATION

Project: Web-Based Genealogy Information System
Status: Finalized (Architecture-Ready)

1. Purpose and Scope

This system is a production-grade web application for recording, managing, and visualizing human genealogy data.
The application prioritizes data correctness, clear lineage representation, and intuitive visualization, while allowing user flexibility in non-core genealogy rules.

The system is intended to support multiple family trees, role-based access, and tree-oriented navigation.

2. User Roles and Access Control
2.1 Roles
* Admin: Full access (create, edit, delete people and relationships)
* Editor: Can create and edit data
* Public User: Read-only access (no authentication)

2.2 Access Rules
* Authentication is required for Admin and Editor
* Public users may view genealogy data without login
* Authorization applies only to write operations

3. Core Domain Concepts
3.1 Person Entity

Each person must exist within a genealogy context and cannot exist without relationships.

Required Attributes
* Unique visible identifier
* Full name
* Gender

Optional Attributes
* Date of birth (may be unknown)
* Place of birth (may be unknown)
* Date of death (may be unknown)

Rules
* Partial or unknown data is allowed
* Every person must be connected to at least one relationship

4. Relationship Modeling
4.1 Supported Relationship Types
* Parent → Child (biological only)
* Spouse

4.2 Relationship Rules
* Parent–child relationships are directional
* Maximum two biological parents
* Multiple spouses over time are allowed
* Relationship history (e.g., divorce) is not preserved
* Relationship correctness is validated at creation time

5. Genealogy Structure Rules
5.1 Tree Integrity
* Every genealogy view must have a root person
* Circular ancestry is strictly forbidden
* The system must prevent:
   - A person becoming their own ancestor or descendant
   - Any cycle in the ancestry graph

5.2 Generations
* Generation levels are automatically inferred
* Generation depth is determined from the selected root

5.3 Navigation
* Users must be able to navigate:
  - Ancestors
  - Descendants
  - Both directions from a selected person

6. Data Presentation & Visualization
6.1 Visualization Modes
* Vertical tree (top-down)
* Horizontal tree (left-right)
* User-selectable mode

6.2 Visual Requirements
* Clear generation separation
* Visible relationship connections
* Expand/collapse branches
* Highlight selected/root person

6.3 Alternative Views
* Textual/list-based view must be available
* Visual tree is the primary presentation

6.4 Frontend Implementation Status (Tree Viewer)

- Node cards: name, optional birth/death year, photo placeholder; root bolded.
- Connectors:
   - Parent–child: solid lines.
   - Spouse: dashed line with interlocked rings at midpoint.
   - Adoption: dotted line.
- Interactions:
   - Click a node to set it as the new root and re-center the tree.
   - Hover a node to highlight its ancestor path and show a tooltip.
   - Zoom in/out/reset with toolbar controls; pan via drag.
   - Search by name and auto-center the first match.
- Layout & Responsiveness:
   - Vertical and horizontal tree layouts with generation bands and labels.
   - Responsive container with ResizeObserver; SVG uses viewBox scaling.
- Export:
   - Export current view to SVG and PNG (toolbar buttons).
- Diagnostics:
   - LOD badge indicates level-of-detail (LOW/MEDIUM/HIGH) based on zoom.
   - Worker mode toggle: Auto (default), Force ON, Force OFF.

6.5 Performance Optimizations (500+ Nodes)

- Virtual rendering: culls off-screen nodes/links to reduce DOM load.
- Level-of-detail (LOD):
   - LOW (zoom < 0.5): minimal markers.
   - MEDIUM (0.5–0.9): name-only nodes.
   - HIGH (> 0.9): full cards with dates/toggle.
- Debounced interactions for zoom, resize, and draw.
- Web Worker layout: offloads D3 tree layout for large trees (auto ≥400 nodes).

6.6 Toolbar Controls (User Guide)

- View Mode: Network | ⬇ Tree | ➡ Tree.
- Zoom: +, ⊙, −.
- Search: live filter by display name; auto-center first match.
- Export: SVG, PNG (tree views only).
- Diagnostics: LOD badge and Worker mode dropdown.

6.7 Known Limitations & Notes

- Marriage indicators render only when both nodes are visible (virtual culling).
- Adoption edges display when provided in render data (optional in backend).
- Very large trees may benefit from initial worker mode = Force ON.

7. Data Input & Editing
7.1 Input Methods
* Person creation form
* Relationship editor
* Combined workflow supported

7.2 Validation Rules
* Prevent logically invalid entries:
   - Child older than parent
   - More than two biological parents
   - Circular ancestry

7.3 Import
* Bulk import is required
* Formats: CSV, GEDCOM (future compatibility)

8. Non-Functional Requirements
8.1 Scale: Target: 500–5,000 people per deployment
8.2 Performance: Tree rendering must be responsive, Lazy loading allowed for deep trees
8.3 Availability: Online-only usage, No offline requirement
8.4 Quality Level: Production-grade system, Maintainable, extensible architecture

9. Design Philosophy
* Data correctness is prioritized over ease of entry
* Core genealogy constraints are enforced
* User flexibility is allowed in non-core behaviors
* Genealogy is treated as graph data, not CRUD records