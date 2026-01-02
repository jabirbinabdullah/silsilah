# Silsilah - System Architecture

## Introduction

Silsilah is a production-grade genealogy management system built using **Domain-Driven Design (DDD)** principles. The system prioritizes data correctness, clear separation of concerns, and explicit invariant enforcement. All business logic resides in a framework-agnostic domain layer, ensuring long-term maintainability and testability.

The architecture consists of four distinct layers:
- **Presentation**: React frontend and HTTP controllers
- **Application**: Command/query handlers and authorization policies
- **Domain**: Core business logic with no framework dependencies
- **Infrastructure**: Persistence adapters, repositories, and external services

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Browser                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         React Frontend (Port 5174)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • TreeViewer Component                               │   │
│  │ • PersonDetailsDrawer                                │   │
│  │ • StatisticsSidebar                                  │   │
│  │ • D3.js Visualization                                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ API Calls (JSON)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│       NestJS Backend API (Port 3000)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Controllers & DTOs (HTTP Layer)                      │   │
│  │ ├─ Genealogy Controller                              │   │
│  │ ├─ Auth Controller                                   │   │
│  │ └─ Health Controller                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Application Layer                                    │   │
│  │ ├─ Commands (CreatePerson, EstablishRelationship)   │   │
│  │ ├─ Queries (GetTree, GetPerson, GetActivity)        │   │
│  │ └─ Policies (Authorization, Validation)             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Domain Layer (Core Business Logic)                   │   │
│  │ ├─ GenealogyGraph (Aggregate Root)                   │   │
│  │ ├─ Person & Relationship Entities                    │   │
│  │ └─ Invariants (No cycles, max 2 parents, etc.)      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ MongoDB Queries
                          ▼
┌─────────────────────────────────────────────────────────────┐
│       MongoDB Database (Port 27017)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Collections:                                         │   │
│  │ • family_trees (Aggregate snapshots)                 │   │
│  │ • users (User accounts & roles)                      │   │
│  │ • audit_logs (Append-only mutation trail)            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Action** → React component dispatches command
2. **API Call** → HTTP POST/GET to NestJS backend
3. **Handler** → Application layer processes request with authorization
4. **Domain Logic** → DDD aggregate enforces invariants
5. **Persistence** → MongoDB snapshot pattern stores state
6. **Response** → Backend returns DTO to frontend
7. **UI Update** → React re-renders with new data
8. **Audit Trail** → All mutations logged to audit_logs collection

---

## Backend Architecture

The backend is organized into three distinct layers, each with clear responsibilities:

### 1. Domain Layer (`backend/src/domain/`)

**Pure business logic with zero framework dependencies.**

- **GenealogyGraph** (Aggregate Root)
  - Main entity representing a family tree
  - Encapsulates persons and relationships
  - Owns and enforces all business rules

- **Person** (Entity)
  - Individual family member with attributes (name, birth, death dates)
  - Tied to a specific GenealogyGraph

- **Relationship** (Value Object)
  - Parent-child and spouse relationships
  - Immutable; no mutable state

- **Domain Errors**
  - `InvariantViolationError` - Rule violation
  - `CycleDetectedError` - Illegal cycle in graph
  - `MaxParentsExceededError` - More than 2 parents

- **Enforced Business Rules**
  - ✅ No cycles in family tree (DAG property)
  - ✅ Maximum 2 parents per person
  - ✅ Age consistency (parent older than child)
  - ✅ Relationship uniqueness (no duplicate links)

### 2. Application Layer (`backend/src/application/`)

**Orchestration of domain logic with authorization and validation.**

- **Commands** (Mutation handlers)
  - `CreatePersonCommand` → Creates new person
  - `EstablishParentChildCommand` → Links parent-child
  - `EstablishSpouseCommand` → Links spouse
  - `RemovePersonCommand` → Deletes person
  - `ImportPersonsCommand` → Bulk imports

- **Queries** (Read-only handlers)
  - `GetTreeQuery` → Retrieves full tree render
  - `GetPersonQuery` → Fetches person details
  - `GetTreeActivityQuery` → Audit trail
  - `GetPersonHistoryQuery` → Person change history

- **Services**
  - Application services coordinate commands/queries
  - Enforce authorization via policies
  - Handle cross-cutting concerns (logging, transactions)

### 3. Infrastructure Layer (`backend/src/infrastructure/`)

**Framework-specific adapters and persistence logic.**

- **Repositories**
  - `MongoGenealogyGraphRepository` - Load/save tree aggregates
  - `MongoUserRepository` - User account persistence
  - `MongoAuditLogRepository` - Append-only audit logs
  - **Snapshot Pattern**: Each aggregate stored as single MongoDB document

- **Controllers** (HTTP Adapters)
  - Express/NestJS endpoints
  - DTO serialization/deserialization
  - Request validation and routing

- **Guards** (Security)
  - JWT authentication (`auth.guard.ts`)
  - Authorization enforcement (`authorization.policy.ts`)
  - Role-based access control (OWNER, EDITOR, VIEWER)

---

## Frontend Architecture

The frontend is a React SPA designed for simplicity and maintainability with clear separation of concerns.

### 1. Component Structure

Organized as a composition hierarchy for genealogy visualization and interaction:

- **TreeViewer** (Container)
  - Root component managing tree state
  - Orchestrates all sub-components
  - Handles keyboard navigation and commands

- **TreeCanvas** (D3 Visualization)
  - Force-directed graph visualization
  - Pan, zoom, and multi-layout support
  - Web Worker integration for large trees (500–5000+ nodes)

- **PersonDetailsDrawer** (Side Panel)
  - Person attributes display
  - Relationship editor
  - Tabs: Details | History (audit trail)
  - Edit/delete actions

- **StatisticsSidebar** (Analytics)
  - Family structure metrics
  - Gender distribution
  - Lifespan analysis
  - Timeline events

- **TreeActivityFeed** (Audit Viewer)
  - Chronological mutation log
  - Actor attribution
  - Pagination support

### 2. State Management

**Intentionally simple for maintainability:**

- **Component-Level State**: `useState` for local UI state (selection, filters, tabs)
- **Props Drilling**: Tree data passed down through component hierarchy
- **No Redux**: Kept simple to reduce complexity; consider refactoring if state becomes unwieldy
- **Query Invalidation**: Manual refetch after mutations (simple, explicit)

### 3. API Client Layer (`frontend/src/api.ts`)

**Centralized HTTP communication:**

```typescript
// Bearer token injection
httpJson(endpoint, { headers: { Authorization: `Bearer ${token}` } })

// Request transformation
getTreeActivity(treeId, options) → GET /api/trees/:treeId/activity

// Error handling & validation
Catches 403 (forbidden), 404 (not found), 500 (server error)
Returns typed response or throws
```

### 4. Service Layer (`frontend/src/services/`)

**DTO transformation and business logic:**

- **auditService**
  - Transforms audit DTOs to frontend models
  - Formats timestamps, actor names
  - Filters and sorts activity

- **Other Services** (as needed)
  - Family tree business rules
  - Statistics calculations
  - Validation helpers

---

## Data Flow Examples

### Example: Creating a New Person

Concrete example showing how a user action flows through all architecture layers:

```
Frontend (React)
    │
    ├─ 1. User clicks "Add Person" button
    │
    ├─ 2. PersonDetailsDrawer form collects: name, birth date, death date
    │
    ├─ 3. Frontend calls API
    │       POST /api/trees/:treeId/persons
    │       Body: { name, birthDate, deathDate }
    │       Headers: { Authorization: Bearer <JWT_TOKEN> }
    │
    └─ 11. Response received, UI updates with new person
             TreeCanvas re-renders with new node
             PersonDetailsDrawer closes

Backend (NestJS)
    │
    ├─ 4. Controller receives request
    │       Extracts UserContext from JWT token
    │       Validates Bearer token, extracts userId and role
    │
    ├─ 5. Controller calls CreatePersonHandler
    │
    Application Layer
    │
    ├─ 6. CreatePersonHandler loads GenealogyGraph aggregate
    │       Repository.load(treeId) → MongoDB document
    │
    ├─ 7. Handler calls aggregate.addPerson(name, birthDate, deathDate)
    │       Domain Layer validation triggers:
    │       ✓ Check age consistency (if parent exists)
    │       ✓ Check duplicate person name
    │       ✓ Enforce invariants
    │
    Domain Layer
    │
    ├─ 8. If validation passes:
    │       Create new Person entity
    │       Add to GenealogyGraph
    │       Return updated aggregate
    │
    Infrastructure Layer
    │
    ├─ 9. Handler saves aggregate
    │       Repository.save(aggregate)
    │       MongoDB: db.family_trees.replaceOne({ treeId }, aggregate)
    │
    ├─ 10. Handler appends audit log
    │        auditRepository.append({
    │          action: 'CREATE_PERSON',
    │          treeId, personId, userId,
    │          timestamp, actor.role
    │        })
    │
    └─ Response sent to frontend (DTO with personId, name)
```

**Key Points:**
- Authorization happens at HTTP boundary (controller)
- Domain logic isolated in aggregate methods
- Persistence is atomic (MongoDB replaceOne)
- Audit trail created for every mutation
- Frontend receives minimal response (DTO, not entire aggregate)

---

## Security Architecture

### 1. Authentication

**JWT-based identity verification:**

- **Token Issuance**: Issued at login endpoint (`POST /auth/login`)
  - Username and password verified against MongoDB users collection
  - Tokens signed with `JWT_SECRET` (environment variable)

- **Token Contents**
  ```
  Payload: { userId, username, role, iat, exp }
  Expires: 7 days (configurable via JWT_EXPIRES_IN)
  ```

- **Verification**: `JwtGuard` middleware on protected endpoints
  - Extracts Bearer token from Authorization header
  - Validates signature with JWT_SECRET
  - Returns 401 if invalid or expired

### 2. Authorization

**Role-based access control (RBAC) for fine-grained permissions:**

| Role | Tree Owner | Modify Data | Delete Data | Export | Manage Members |
|------|------------|-------------|-------------|--------|-----------------|
| **OWNER** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **EDITOR** | ❌ | ✅ | ❌ | ✅ | ❌ |
| **VIEWER** | ❌ | ❌ | ❌ | ❌ | ❌ |

- **Enforcement**: `AuthorizationPolicy` checks role before handler execution
- **Guard Placement**: Decorators on controllers for HTTP protection
  - `@Requires('OWNER')` - Owner-only endpoints
  - `@Requires('EDITOR', 'OWNER')` - Modify operations
  - No guard - Public read (if applicable)

### 3. Security Measures

**Defense-in-depth implementation:**

- **Password Security**
  - Hashed with bcrypt (salt rounds: 10)
  - Never stored in plaintext
  - Salted per user

- **Secret Management**
  - `JWT_SECRET` from environment variable (not hardcoded)
  - Minimum 32 characters recommended for production
  - Never logged or exposed in error messages

- **Transport Security**
  - HTTPS enforced in production (`NODE_ENV=production`)
  - HTTP for development allowed

- **CORS Policy**
  - Whitelist allowed origins in `ALLOWED_ORIGINS` env var
  - Prevents unauthorized cross-origin requests
  - Credentials mode controlled

- **Rate Limiting** (Planned for v1.1)
  - Authentication endpoints (login)
  - Query endpoints (prevent data harvesting)
  - Mutation endpoints (prevent spam)

- **Audit Trail**
  - All mutations logged with user attribution
  - Append-only MongoDB collection
  - Enables forensic investigation

---

## Database Schema

MongoDB collections storing system state with optimistic locking and comprehensive audit trail.

### 1. family_trees Collection

**Snapshot of GenealogyGraph aggregate (one document per tree):**

```javascript
{
  _id: "tree-uuid",                    // Tree identifier
  ownerId: "user-uuid",                // Owner's user ID
  members: [                           // Collaborators
    { userId: "user2", role: "EDITOR" },
    { userId: "user3", role: "VIEWER" }
  ],
  persons: [                           // All persons in tree
    {
      personId: "p1",
      name: "John Doe",
      gender: "MALE",
      birthDate: ISODate("1980-01-15"),
      deathDate: ISODate("2020-06-20"),
      birthPlace: "New York",
      deathPlace: "Boston"
    }
  ],
  parentChildEdges: [                  // Parent-child relationships
    { parentId: "p1", childId: "p2" }
  ],
  spouseEdges: [                       // Spouse relationships
    { spouse1Id: "p1", spouse2Id: "p3" }
  ],
  version: 5,                          // Optimistic locking (incremented on updates)
  createdAt: ISODate("2024-12-01"),
  updatedAt: ISODate("2024-12-15")
}
```

**Indexes:**
```
{ _id: 1 }                             // Default (unique)
{ ownerId: 1 }                         // Find trees by owner
{ "members.userId": 1 }                // Find trees by member
{ createdAt: -1 }                      // Sort by creation date
```

### 2. users Collection

**User accounts with authentication credentials:**

```javascript
{
  _id: "user-uuid",
  username: "john_doe",                // Unique identifier
  email: "john@example.com",           // Optional contact
  passwordHash: "$2b$10$...",          // bcrypt hash
  role: "OWNER",                       // Global role (not tree-specific)
  createdAt: ISODate("2024-01-01")
}
```

**Indexes:**
```
{ _id: 1 }                             // Default (unique)
{ username: 1, unique: true }          // Login lookup (unique)
{ email: 1, sparse: true }             // Email lookups (optional field)
```

### 3. audit_logs Collection

**Append-only mutation trail (immutable):**

```javascript
{
  _id: ObjectId(),                     // MongoDB auto-generated
  treeId: "tree-uuid",
  personId: "p1",                      // Optional (person-specific actions)
  action: "CREATE_PERSON",             // Action type (see audit.dto.ts)
  actor: {
    userId: "user-uuid",
    username: "john_doe",
    role: "OWNER"
  },
  details: {                           // Action-specific data
    name: "Jane Doe",
    gender: "FEMALE"
  },
  timestamp: ISODate("2024-12-15T10:30:00Z"),
  _version: 1                          // Immutable version marker
}
```

**Indexes:**
```
{ treeId: 1, timestamp: -1 }           // Tree-wide activity (chronological)
{ treeId: 1, personId: 1, timestamp: -1 }  // Person history
{ userId: 1, timestamp: -1 }           // User activity trail
{ action: 1 }                          // Filter by action type
{ timestamp: -1 }                      // TTL index (optional, for cleanup)
```

### Key Design Patterns

- **Snapshot Pattern**: Entire aggregate stored as single MongoDB document (atomic writes)
- **Optimistic Locking**: Version field prevents concurrent modification conflicts
- **Append-Only Audit**: audit_logs never updated, only inserted
- **Compound Indexes**: Support common query patterns (tree + time, person + history)

---

## Key Design Decisions

### 1. Why Domain-Driven Design?

Genealogy systems enforce complex business rules that must be correct:

- **Cycle Prevention**: Family trees are directed acyclic graphs (DAG); cycles corrupt lineage
- **Parent Limits**: Biological constraint (max 2 parents) is non-negotiable
- **Age Consistency**: Parent must be older than child (prevents logical errors)
- **Relationship Uniqueness**: Prevent duplicate or contradictory relationships

DDD isolates these rules in a framework-independent domain layer, ensuring they're enforced even if infrastructure changes. Long-term maintainability and testability are paramount.

### 2. Why MongoDB Snapshot Pattern?

Family tree aggregate fits naturally within a single document:

- **Document Structure**: Persons, relationships, and metadata in one object
- **Atomic Writes**: Single `replaceOne()` ensures all-or-nothing updates
- **No Normalization Overhead**: Avoid costly joins across tables
- **Trade-off**: Limited query capabilities across multiple trees; queries require document loading

Alternative (PostgreSQL + normalization) would require:
- Complex joins across persons, relationships, and parent-child tables
- Multi-table transactions for consistency
- Expensive normalization overhead for simple genealogy access patterns

### 3. Why Aggregate-Based Persistence?

GenealogyGraph is the consistency boundary:

- **Single Responsibility**: One aggregate per tree simplifies transactions
- **Enforced Invariants**: All mutations go through domain methods (`addPerson()`, `establishParentChild()`)
- **Fail-Fast Hydration**: Loading triggers full invariant re-validation
- **Prevents Data Corruption**: Invalid data cannot exist in database without triggering errors

### 4. Trade-offs & Alternatives

| Aspect | Chosen | Alternative | Trade-off |
|--------|--------|-------------|-----------|
| **Database** | MongoDB | PostgreSQL | Simpler for genealogy, less for analytics |
| **Persistence** | Snapshot | Event Sourcing | Easier to understand, can't replay mutations |
| **Graph DB** | MongoDB | Neo4j | Better for complex queries, harder to enforce invariants |
| **Query Pattern** | Load aggregate | Read models | Simpler code, slower for large trees |

**Decision Rationale:**
- Genealogy access patterns are tree-scoped (single tree queries dominate)
- Correctness > performance for this domain
- Simplicity enables long-term maintenance
- Can migrate to event sourcing/Neo4j later if needed (architecture supports it)

---

**For detailed architectural information**, see:
- [docs/DOMAIN_MODEL.md](DOMAIN_MODEL.md) - Domain layer details
- [backend/AUTHORIZATION.md](../backend/AUTHORIZATION.md) - Authorization policy details
- [docs/ROADMAP.md](ROADMAP.md) - Full architecture breakdown
