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