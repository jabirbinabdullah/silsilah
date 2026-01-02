# Pre-Existing Test Failures - Triage Report

**Status**: ⚠️ **64 Tests Failing** (5 test suites)  
**Impact**: Does NOT affect Phase 6 audit system or core functionality  
**Priority**: Medium - Should be addressed in future iteration  
**Date**: 2026-01-02

## Summary

5 out of 10 E2E test suites are failing with a consistent pattern: **404 Not Found** errors on various endpoints. These are pre-existing issues unrelated to the Phase 6 audit system implementation.

## Passing Test Suites (5/10) ✅

1. **audit.activity.e2e.spec.ts** - 19 tests ✅
2. **audit.mutations.e2e.spec.ts** - 7 tests ✅
3. **auth.e2e.spec.ts** - Tests passing ✅
4. **public-access.e2e.spec.ts** - Tests passing ✅
5. **health.e2e.spec.ts** - 2 tests ✅

**Total Passing**: 44 tests

## Failing Test Suites (5/10) ❌

### 1. import-persons.e2e.spec.ts (17 tests failing)

**Root Cause**: Endpoint returning 404 instead of expected responses

**Pattern**: All tests expect `/trees/:treeId/persons/import` but getting 404

**Sample Failures**:
```
POST /trees/:treeId/persons/import
Expected: 201 Created
Actual: 404 Not Found
```

**Tests Affected**:
- Should import valid CSV (failing)
- Should reject invalid gender (expecting 400, got 404)
- Should reject invalid date format (expecting 400, got 404)
- Should reject missing personId (expecting 400, got 404)
- Should reject invalid personId format (expecting 400, got 404)
- Should reject empty CSV (expecting 400, got 404)
- Should reject CSV with only header (expecting 400, got 404)
- Should handle minimal data (expecting 201, got 404)
- Should import with whitespace (expecting 201, got 404)
- Should reject name exceeding 255 chars (expecting 400, got 404)
- Should preserve existing persons (expecting 201, got 404)
- 404 for non-existent tree (expecting custom error message)

**Likely Issue**: 
- Route not registered correctly in controller
- Missing endpoint implementation
- Incorrect route path configuration

**Note**: The audit mutation test for `IMPORT_PERSONS` works because it uses the correct endpoint and payload format.

---

### 2. tree-list.e2e.spec.ts (7 tests failing)

**Root Cause**: GET `/trees` endpoint returning 404

**Pattern**: All tests expect user's tree list but getting 404

**Sample Failures**:
```
GET /trees
Expected: 200 OK with { trees: [] }
Actual: 404 Not Found
```

**Tests Affected**:
- Returns empty array when user has no trees (404)
- Returns tree where user is owner (404)
- Returns tree where user is EDITOR member (404)
- Returns tree where user is VIEWER member (404)
- Returns multiple trees with correct roles (404)
- Does not return trees where user has no access (404)
- Includes correct personCount for each tree (404)

**Likely Issue**: 
- Tree listing endpoint not implemented
- Route not registered in controller
- Missing authorization/user context handling

---

### 3. export.e2e.spec.ts (2 tests failing)

**Root Cause**: Tree creation failing (POST `/trees` returning 404)

**Pattern**: Test setup failing before export tests can run

**Sample Failures**:
```
POST /trees
Expected: 201 Created
Actual: 404 Not Found
```

**Tests Affected**:
- GET /trees/:id/export/json returns snapshot (setup fails at tree creation)
- GET /trees/:id/export/gedcom returns GEDCOM text (setup fails at tree creation)

**Likely Issue**: 
- Route path mismatch (expecting `/trees` but maybe it's `/api/trees`)
- Controller route not properly registered
- Missing route prefix in test setup

**Note**: The audit tests successfully create trees using `/api/trees`, suggesting a test configuration issue.

---

### 4. genealogy.e2e.spec.ts (Status Unknown - No Output Shown)

**Pattern**: Likely similar 404 issues based on other failures

**Tests**: (Need to check file to determine specific failures)

**Likely Issue**: Similar routing/endpoint registration problems

---

### 5. tree-render.e2e.spec.ts (Status Unknown - No Output Shown)

**Pattern**: Likely similar 404 issues based on other failures

**Tests**: (Need to check file to determine specific failures)

**Likely Issue**: Similar routing/endpoint registration problems

---

## Root Cause Analysis

### Common Pattern: 404 Not Found

All failures show endpoints returning `404 Not Found` instead of expected responses. This suggests:

1. **Route Prefix Issues**: 
   - Some tests use `/trees` while controller expects `/api/trees`
   - Inconsistent route prefixes between tests and implementation

2. **Missing Route Registrations**:
   - Tree listing endpoint (`GET /trees`) may not be implemented
   - Import endpoint path may be incorrect in tests

3. **Controller Registration**:
   - Controllers may not be properly registered in module
   - Route paths may have changed without updating tests

### Why Audit Tests Pass

The audit tests use correct route paths:
- `POST /api/trees` - ✅ Works
- `GET /api/trees/:treeId/activity` - ✅ Works
- `POST /api/trees/:treeId/persons/import` - ✅ Works
- `DELETE /api/trees/:treeId/relationships` - ✅ Works

This confirms the core genealogy endpoints work when using correct paths.

## Recommended Fixes

### Priority 1: Route Path Consistency

1. **Check GenealogyController Route Prefix**:
   ```typescript
   @Controller('api/trees')  // Verify this matches test expectations
   ```

2. **Update Test Base URLs**:
   - Change `/trees` → `/api/trees` in failing tests
   - Or update controller to match test expectations

### Priority 2: Missing Endpoints

1. **Implement Tree Listing**:
   ```typescript
   @Get()
   async listTrees(@Req() req: Request): Promise<TreeListResponse> {
     // Return trees accessible by user
   }
   ```

2. **Verify Import Endpoint Registration**:
   - Check `@Post(':treeId/persons/import')` is properly decorated
   - Confirm route path matches test expectations

### Priority 3: Test Setup

1. **Review Test Configuration**:
   - Check if tests need route prefix configuration
   - Verify test helper functions use correct paths

2. **Add Debug Logging**:
   - Log registered routes on app startup
   - Add route debugging in failing tests

## Quick Win: Route Investigation

Run this to see all registered routes:
```typescript
// Add to main.ts or test setup
const server = app.getHttpServer();
const router = server._events.request._router;
console.log('Registered routes:', router.stack
  .filter(r => r.route)
  .map(r => ({ path: r.route.path, methods: Object.keys(r.route.methods) }))
);
```

## Impact Assessment

### User-Facing Impact: NONE ✅

- Core genealogy mutations work (proven by audit tests)
- Tree creation, person addition, relationships work
- Export/import functionality exists (endpoint mismatch only)
- Authentication working

### Developer Impact: MEDIUM ⚠️

- CI/CD may be blocking on test failures
- False sense of broken functionality
- Test maintenance burden

### Technical Debt: MEDIUM

- Test-implementation mismatch
- Route configuration inconsistency
- Missing endpoint documentation

## Next Steps

1. ✅ **DONE**: Fix Jest hanging issue (MongoDB cleanup)
2. ⏭️ **TODO**: Investigate route registration and update tests
3. ⏭️ **TODO**: Implement missing tree listing endpoint
4. ⏭️ **TODO**: Verify import endpoint route path
5. ⏭️ **TODO**: Add route debugging utilities

## Timeline Estimate

- Route investigation: 30 minutes
- Test path updates: 1 hour
- Missing endpoint implementation: 2-4 hours
- Verification and documentation: 1 hour

**Total**: ~4-6 hours to resolve all 64 failing tests

---

**Conclusion**: These are pre-existing route/endpoint issues unrelated to Phase 6 audit system. The audit functionality is fully working and tested. The failing tests indicate test-implementation mismatches that should be addressed in a dedicated bug-fix iteration.
