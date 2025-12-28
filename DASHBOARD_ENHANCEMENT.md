# Dashboard Enhancement: Tree Creation & Duplication

## Overview
Enhanced the Dashboard (TreeList page) with comprehensive tree creation functionality, including:
- FAB button for quick access
- Create new tree with metadata (name, description, visibility)
- Duplicate existing trees
- Auto-navigation to newly created trees
- GEDCOM import placeholder for future implementation

## Components Created

### 1. CreateTreeModal.tsx
**File**: `frontend/src/components/CreateTreeModal.tsx`

**Features**:
- Modal dialog with two modes: "Create New" and "Duplicate"
- Create Mode:
  - Tree name (required)
  - Description (optional, textarea)
  - Visibility selector (Public/Private)
  - GEDCOM file upload (disabled, placeholder for stretch goal)
- Duplicate Mode:
  - Tree name (required, auto-populated with "My Tree Copy")
  - Source tree selector (dropdown of available trees, auto-loaded)
- Error handling with user-friendly messages
- Loading state with spinner
- Form validation (empty name prevention)
- Modal state management (open/close, form reset)

**Type Safety**:
- Imports `TreeListResponse` and tree creation types from `api.ts`
- Proper async error handling
- TypeScript interfaces for component props

## API Functions Added

### In `api.ts`

#### `createTree(payload)`
```typescript
export async function createTree(payload: {
  name: string;
  description?: string;
  visibility?: 'public' | 'private';
}): Promise<{ treeId: string; name: string }>
```
- **Endpoint**: POST `/trees`
- **Headers**: Content-Type, Authorization (if token available)
- **Returns**: Tree ID and name
- **Error Handling**: Throws with status code and response text

#### `duplicateTree(sourceTreeId, newName)`
```typescript
export async function duplicateTree(
  sourceTreeId: string,
  newName: string
): Promise<{ treeId: string; name: string }>
```
- **Endpoint**: POST `/trees/{sourceTreeId}/duplicate`
- **Payload**: `{ newName }`
- **Headers**: Content-Type, Authorization (if token available)
- **Returns**: New tree ID and name
- **Error Handling**: Throws with status code and response text

## TreeList Integration

### Changes to `TreeList.tsx`

1. **Imports**:
   - Added `useNavigate` from `react-router-dom`
   - Added `CreateTreeModal` component import

2. **State**:
   - Added `isCreateModalOpen` state for modal visibility

3. **Handler Function**:
   - Added `handleTreeCreated(treeId)` function that:
     - Closes the modal
     - Refreshes the tree list
     - Navigates to the newly created tree

4. **FAB Button**:
   - Fixed position bottom-right corner
   - Size: 3.5rem x 3.5rem
   - Styling: Blue background with hover effect
   - Accessibility: Title tooltip
   - Opens CreateTreeModal on click

5. **Modal Integration**:
   - Modal passed with `isOpen`, `onClose`, `onSuccess` props
   - Success callback triggers navigation and refresh

## User Flow

1. **User Action**: Click FAB button in bottom-right
2. **Modal Opens**: CreateTreeModal appears with default "Create New" mode
3. **Create Option**:
   - Enter tree name (required), description, select visibility
   - Click "Create Tree" button
   - Backend creates tree with root person (creator)
   - Modal closes, tree list refreshes
   - User navigates to new tree visualization
4. **Duplicate Option**:
   - Switch to "Duplicate" mode
   - Select source tree from dropdown
   - Enter new tree name
   - Click "Duplicate Tree" button
   - Backend duplicates entire tree structure with new root person reference
   - Modal closes, tree list refreshes
   - User navigates to duplicated tree

## Future Enhancements

### GEDCOM Import (Stretch Goal)
- File upload input currently disabled
- Placeholder UI in "Create New" mode
- Intended to:
  - Accept .ged/.gedcom files
  - Parse and import family data
  - Create people and relationships from GEDCOM structure
  - Auto-create root person from GEDCOM entries

### Additional Features
- Batch tree creation (multiple at once)
- Template selection for common family structures
- Privacy settings with sharing/collaboration
- Backup and restore from GEDCOM export

## Technical Notes

- **Performance**: Modal state separate from tree list refresh; no blocking operations
- **Error States**: User-friendly error messages with retry capability
- **Loading States**: Visual feedback during tree creation (spinner in button)
- **Accessibility**: Focus management, ARIA labels, keyboard navigation
- **Responsive**: Tailwind CSS for modal styling; fixed FAB works on all viewports

## Testing Checklist

- [ ] FAB button visible and clickable on TreeList
- [ ] Modal opens/closes without errors
- [ ] "Create New" mode validates required fields
- [ ] "Duplicate" mode loads available trees
- [ ] Tree creation API call succeeds with proper payload
- [ ] Tree duplication API call succeeds
- [ ] Navigation to new tree after creation
- [ ] Tree list refreshes with new tree
- [ ] Error messages display correctly
- [ ] Form resets after successful creation
- [ ] Modal dismisses on close or success
