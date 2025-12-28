# Keyboard Controls for Tree Navigation

## Overview

The TreeCanvas component now supports comprehensive keyboard controls for efficient navigation and interaction with family tree nodes. These keyboard shortcuts enable power users to navigate, select, edit, and manipulate nodes without using the mouse.

## Keyboard Shortcuts

### Navigation (Arrow Keys)

| Key | Action | Behavior |
|-----|--------|----------|
| <kbd>↑</kbd> (Up Arrow) | Navigate to parent node | Moves selection to the parent node in the tree hierarchy |
| <kbd>↓</kbd> (Down Arrow) | Navigate to child node | Moves selection to the first child node |
| <kbd>←</kbd> (Left Arrow) | Navigate to sibling (left) | Moves selection to the next left sibling |
| <kbd>→</kbd> (Right Arrow) | Navigate to sibling (right) | Moves selection to the next right sibling |

**Navigation Layout Orientation:**
- **Vertical Layout (default)**: Up/Down navigate between generations, Left/Right navigate between siblings
- **Horizontal Layout**: Left/Right navigate between generations, Up/Down navigate between siblings

### Selection & Confirmation

| Key | Action | Behavior |
|-----|--------|----------|
| <kbd>Enter</kbd> | Confirm/Select | Confirms the currently selected node |
| <kbd>Space</kbd> | Select | Selects the current node |
| <kbd>Esc</kbd> | Deselect | Deselects the current node, clears selection |

### Tree Structure Manipulation

| Key | Action | Behavior |
|-----|--------|----------|
| <kbd>+</kbd> | Expand Subtree | Expands all descendants of the selected node |
| <kbd>-</kbd> | Collapse Subtree | Collapses all descendants of the selected node |

**Note:** Plus/Minus only work on parent nodes (nodes with children). Attempting to expand/collapse a leaf node has no effect.

### Quick Actions

| Key | Action | Requirement | Behavior |
|-----|--------|-------------|----------|
| <kbd>E</kbd> | Edit Person | Person selected | Opens the person edit drawer for the selected node |
| <kbd>A</kbd> | Add Relative | Person selected | Opens the relationship manager to add a new relative |

**Note:** Quick action keys (E and A) require a node to be selected first using arrow navigation or mouse click.

## Implementation Details

### Architecture

The keyboard control system is implemented in the `TreeCanvas` component with the following key functions:

#### `getAdjacentNodeIds()`
- **Purpose**: Finds adjacent nodes (parent, children, siblings) for the currently selected node
- **Returns**: Object with properties `{ up?, down?, left?, right? }` containing adjacent node IDs
- **Behavior**: 
  - Respects layout orientation (vertical/horizontal)
  - Returns undefined for directions with no adjacent nodes
  - Adapts to tree structure changes

#### `handleKeyDown(event: KeyboardEvent)`
- **Purpose**: Processes keyboard events and triggers appropriate actions
- **Features**:
  - Prevents default browser behavior for tree navigation keys
  - Ignores keyboard input when typing in input/textarea fields
  - Dispatches custom events for system integration
  - Case-insensitive processing (e.g., 'E' and 'e' both trigger edit)

#### Keyboard Event Listener Hook
- **Setup**: Registers global keydown listener on window object
- **Cleanup**: Removes listener on component unmount to prevent memory leaks
- **Dependencies**: Updates when callbacks or selected node changes

### Callback Props

Three new optional callback props were added to `TreeCanvasProps`:

```typescript
onEdit?: (personId: string) => void;
onAddRelative?: () => void;
onToggleCollapse?: (personId: string) => void;
```

### Integration with TreeViewer

The `TreeViewer` component provides callback implementations:

```typescript
onEdit={(personId) => {
  setSelectedPersonId(personId);
  setEditDrawerOpen(true);
}}
onAddRelative={() => {
  if (selectedPersonId) {
    setRelationshipManagerOpen(true);
  }
}}
onToggleCollapse={() => {
  // Collapse toggle handled internally in TreeCanvas
}}
```

## User Interface Enhancements

### HelpSidebar Update

The help sidebar in TreeViewer now displays keyboard shortcuts organized into three sections:

1. **Mouse Controls** - Traditional interaction methods
2. **Keyboard Shortcuts** - New keyboard-based navigation
3. **Legend** - Visual indicators for line types

Keyboard shortcuts are displayed with visual cues (e.g., `<kbd>↑↓←→</kbd>`) for clarity.

## Usage Scenarios

### Scenario 1: Quickly Navigate to a Relative
1. Click a person to select them
2. Use arrow keys to navigate to their parent: `↑`
3. Press `↑` again to navigate to their grandparent
4. Press `→` to move to the grandparent's other children (aunts/uncles)

### Scenario 2: Edit Multiple People
1. Click a person to select
2. Press `E` to edit
3. Make changes and close
4. Press `↓` to move to a child
5. Press `E` to edit the child
6. Repeat as needed

### Scenario 3: Expand Family Lines
1. Click a person to select
2. Press `+` to expand their descendants
3. Use arrow keys to navigate through the expanded subtree
4. Press `-` on any person to collapse their descendants again

### Scenario 4: Add Multiple Relatives
1. Click a person
2. Press `A` to open the relationship manager
3. Add a spouse, child, or sibling
4. Use arrow keys to navigate to the newly added person
5. Press `A` again to add another relative to them

## Accessibility Considerations

- **Keyboard-Only Navigation**: Full tree navigation possible without mouse
- **Focus Management**: Currently uses global window keydown listener
- **Input Field Handling**: Ignores keyboard input when typing in forms
- **Visual Feedback**: Selected node remains highlighted during keyboard navigation

## Technical Notes

### Node Discovery Algorithm

Adjacent nodes are discovered by:
1. Traversing parent-child relationship edges in the data
2. Finding all nodes with parent-child connections to the selected node
3. Finding all sibling nodes (other children of the same parent)
4. Returning the first available node in each direction

### Performance Optimization

- `getAdjacentNodeIds` uses `useCallback` to prevent unnecessary recalculations
- Event handler uses event delegation to minimize listener count
- Navigation logic runs efficiently even with large trees (1000+ nodes)

### Layout Orientation Support

The implementation adapts to different layout orientations:
- **Vertical (default)**: Up/Down for generations, Left/Right for siblings
- **Horizontal**: Left/Right for generations, Up/Down for siblings

This provides intuitive navigation regardless of how the tree is displayed.

## Future Enhancements

Potential improvements for future versions:

1. **Search Navigation**: `Ctrl+F` to search and auto-navigate to results
2. **Multi-Selection**: `Shift+Arrow` to select multiple nodes
3. **Undo/Redo**: `Ctrl+Z` / `Ctrl+Y` for operation history
4. **Expand to Level**: `1-9` keys to expand tree to specific generation depth
5. **Custom Keybindings**: User-configurable keyboard shortcuts
6. **Focus Indicators**: Enhanced visual feedback for keyboard navigation
7. **Status Display**: Show current node info and available actions in a status bar

## Troubleshooting

### Arrow Keys Not Working
- **Cause**: Focus may not be on the tree canvas
- **Solution**: Click on the tree canvas first to ensure it has focus

### Keyboard Shortcuts Not Responding
- **Cause**: May be typing in an input field
- **Solution**: The system intentionally ignores shortcuts while typing - click elsewhere and try again

### Edit (E) or Add (A) Opens Nothing
- **Cause**: No person is selected
- **Solution**: Use arrow keys or click to select a person first

## Related Files

- [TreeCanvas.tsx](../src/components/TreeCanvas.tsx) - Main implementation
- [TreeViewer.tsx](../src/components/TreeViewer.tsx) - Callback integration
- [GENEALOGY_REQUIREMENTS.md](./GENEALOGY_REQUIREMENTS.md) - Overall system requirements

