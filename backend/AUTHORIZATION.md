# Role-Based Authorization

## Overview

The Genealogy Application implements role-based access control (RBAC) at the application layer. All commands and queries require a user context with a defined role.

## User Roles

| Role   | Description                                    |
|--------|------------------------------------------------|
| OWNER  | Full control: create, edit, delete, ownership  |
| EDITOR | Create and modify data; cannot delete trees     |
| VIEWER | Read-only access to genealogy data             |

## Authorization Matrix

### Commands (Mutations)

| Command                    | OWNER | EDITOR | VIEWER |
|----------------------------|-------|--------|--------|
| Create Family Tree         | ✓     | ✓      | ✗      |
| Create Person              | ✓     | ✓      | ✗      |
| Establish Parent-Child     | ✓     | ✓      | ✗      |
| Establish Spouse           | ✓     | ✓      | ✗      |
| Remove Relationship        | ✓     | ✓      | ✗      |
| **Remove Person**          | ✓     | ✗      | ✗      |

### Queries (Read-Only)

| Query             | OWNER | EDITOR | VIEWER |
|-------------------|-------|--------|--------|
| Get Person        | ✓     | ✓      | ✓      |
| Get Ancestors     | ✓     | ✓      | ✓      |
| Get Descendants   | ✓     | ✓      | ✓      |
| Render Tree       | ✓     | ✓      | ✓      |

## Authorization Rules

### Mutations (require EDITOR or OWNER)
- All commands that modify data require user to be `EDITOR` or `OWNER`.
- `AuthorizationError` is thrown if role is `VIEWER`.

### Delete Person (require OWNER)
- Removing a person from a tree is restricted to `OWNER` role only.
- This prevents accidental data loss and maintains audit control.

### Queries (allow VIEWER, EDITOR, OWNER)
- All read operations are available to any authenticated user.
- No role differentiation for queries.

## Usage

### Setting User Context

Before executing any command or query, set the user context on the application service:

```typescript
const userContext: UserContext = {
  userId: 'user-123',
  username: 'john_doe',
  role: 'EDITOR',
};

appService.setUserContext(userContext);
```

### Command Execution with Authorization

```typescript
// This will succeed if user is EDITOR or OWNER
await appService.handleCreatePerson({
  treeId: 'tree-001',
  personId: 'person-001',
  name: 'John Doe',
  gender: 'MALE',
});

// This will fail with AuthorizationError if user is not OWNER
try {
  await appService.handleRemovePerson({
    treeId: 'tree-001',
    personId: 'person-001',
  });
} catch (err) {
  if (err instanceof AuthorizationError) {
    console.error('Only owners can remove persons:', err.message);
  }
}
```

### Query Execution with Authorization

```typescript
// All authenticated users can query
const person = await appService.handleGetPerson({
  treeId: 'tree-001',
  personId: 'person-001',
});

const ancestors = await appService.handleGetAncestors({
  treeId: 'tree-001',
  personId: 'person-001',
});
```

## Error Handling

Authorization failures throw `AuthorizationError`:

```typescript
import { AuthorizationError } from './domain/errors';

try {
  await appService.handleRemovePerson(cmd);
} catch (err) {
  if (err instanceof AuthorizationError) {
    // Handle insufficient permissions
    response.status(403).json({ error: err.message });
  }
}
```

### HTTP Status Codes

Controllers map `AuthorizationError` to HTTP responses:

| Error                | HTTP Status | Meaning                           |
|----------------------|-------------|----------------------------------|
| AuthorizationError   | 403         | Forbidden: insufficient permissions |
| Missing user context | 401         | Unauthorized: no authentication     |

## Controller Integration

Controllers do **not** implement authorization logic. They simply:
1. Extract user info from request context (e.g., JWT claims, session)
2. Call `setUserContext()` on the service
3. Execute commands/queries
4. Map errors to HTTP responses (see error handling)

Example:

```typescript
@Post('trees')
async createTree(
  @Body() dto: CreateFamilyTreeDto,
  @Req() req: Request,
) {
  const userContext: UserContext = {
    userId: req.user.id,
    username: req.user.name,
    role: req.user.role,
  };
  
  this.appService.setUserContext(userContext);
  return this.appService.handleCreateFamilyTree({ treeId: dto.treeId });
}
```

## Future Extensions

- **Tree-level ownership**: Extend `TreeOwnership` interface to track per-tree permissions.
- **Granular access**: Implement resource-level ACLs for shared trees.
- **Audit logging**: Log all mutations with user ID and timestamp.
- **Rate limiting**: Limit mutations per user per time window.
