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

---

# Tree Ownership and Membership Management

## Overview

The Genealogy Application supports multi-user access to trees through an ownership and membership system. Each tree has one owner and multiple members with assigned roles.

## Ownership Model

### Tree Owner
- Each tree has exactly **one owner** (the creator by default).
- Owner controls all aspects of the tree, including membership and deletion.
- Owner can transfer ownership to another member.

### Tree Members
- Members are users granted access to a tree with a specific role (VIEWER, EDITOR, or OWNER).
- Members array does not include the owner (owner is tracked separately).
- Each member has a role that determines their permissions for that tree.

### Member Roles

| Role   | Tree Permissions                                      |
|--------|-------------------------------------------------------|
| OWNER  | Full control: create, edit, delete, manage members    |
| EDITOR | Create and modify data; cannot delete or manage       |
| VIEWER | Read-only access to genealogy data                    |

## Membership Operations

### Add Member

**Method:** `addMember(treeId, ownerContext, userId, role)`

**Requirements:**
- Caller must be OWNER of the tree
- Target user cannot be the current owner
- Target user must not already be a member

**Behavior:**
- Adds the user as a member with the specified role
- Throws `MembershipError` if user already exists or is the owner
- Throws `AuthorizationError` if caller is not the owner

### Remove Member

**Method:** `removeMember(treeId, ownerContext, userId)`

**Requirements:**
- Caller must be OWNER of the tree
- Target user cannot be the owner

**Behavior:**
- Removes the user from the members list
- Throws `OwnershipError` if trying to remove the owner
- Throws `MembershipError` if user is not a member
- Throws `AuthorizationError` if caller is not the owner

### Change Member Role

**Method:** `changeMemberRole(treeId, ownerContext, userId, newRole)`

**Requirements:**
- Caller must be OWNER of the tree
- Target user must be a member or the owner
- Cannot downgrade the last owner to non-owner role

**Behavior:**
- Updates the member's role
- If changing the owner's role: verifies there's at least one other OWNER
- Throws `MembershipError` if user is not part of the tree
- Throws `OwnershipError` if trying to downgrade the last owner
- Throws `AuthorizationError` if caller is not the owner

### Transfer Ownership

**Method:** `transferOwnership(treeId, ownerContext, newOwnerId)`

**Requirements:**
- Caller must be OWNER of the tree
- Target user must be a member of the tree
- Target user cannot be the current owner

**Behavior:**
- Transfers ownership to the target user
- Current owner becomes EDITOR in the members list
- Throws `OwnershipError` if target is same as current owner
- Throws `MembershipError` if target is not a member
- Throws `AuthorizationError` if caller is not the owner

## Ownership Rules

### Invariants

1. **Every tree has exactly one owner**
   - Owner cannot be removed from the tree
   - Cannot remove the last owner

2. **Owner cannot be re-added as a member**
   - The owner is tracked separately from the members array
   - Adding the owner as a member is rejected

3. **Members must exist before role changes**
   - Can only change roles for users already in the tree
   - Non-existent users cannot be added via role change

4. **Ownership transfer requirements**
   - Only members can become owners
   - Must add user as member before transferring ownership

### Error Types

| Error            | Thrown When                                        |
|------------------|----------------------------------------------------|
| `OwnershipError` | Invalid ownership operation (last owner removal, transfer to self) |
| `MembershipError` | Invalid membership operation (duplicate, not found, non-member owner transfer) |

## Persistence

Ownership metadata is stored in the family_trees collection with optimistic locking for concurrency control.

## Future Enhancements

- **Role inheritance**: Allow OWNER role to inherit from EDITOR permissions
- **Batch member operations**: Add/remove/change multiple members at once
- **Member invitations**: Send invites before confirming membership
- **Access audit trail**: Log all membership changes
- **Default tree access**: Grant organization-wide access by default
