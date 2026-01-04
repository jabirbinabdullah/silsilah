# Keyboard Controls Visual Guide

## Keyboard Layout Reference

```
┌─────────────────────────────────────────────────────┐
│  NAVIGATION                                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│              ARROW KEYS                            │
│                    ↑ UP (Parent)                   │
│                    ↓ DOWN (Child)                  │
│            ← LEFT (Sibling)  → RIGHT (Sibling)    │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  SELECTION                                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│     Enter / Space = SELECT       Esc = DESELECT   │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  TREE CONTROL                                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│          + Key = EXPAND        - Key = COLLAPSE   │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  QUICK ACTIONS (Require Selected Person)           │
├─────────────────────────────────────────────────────┤
│                                                     │
│            E = EDIT        A = ADD RELATIVE       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Keyboard Shortcut Cheat Sheet

| Category | Key(s) | Action | Requirements |
|----------|--------|--------|--------------|
| **Navigation** | ↑ | Go to parent node | Tree has parents |
|  | ↓ | Go to child node | Person has children |
|  | ← | Go to left sibling | Person has siblings |
|  | → | Go to right sibling | Person has siblings |
| **Selection** | Enter | Confirm/Select | - |
|  | Space | Select | - |
|  | Esc | Deselect | Node selected |
| **Tree Control** | + | Expand subtree | Person has children |
|  | - | Collapse subtree | Node expanded |
| **Actions** | E | Edit person | Person selected |
|  | A | Add relative | Person selected |

## Navigation Examples

### Example 1: Navigate to Grandparent
```
1. Click on person (or use arrow keys to select)
2. Press ↑ once → moves to parent
3. Press ↑ again → moves to grandparent
```

### Example 2: Navigate Between Siblings
```
1. Click on person (James)
2. Press → → navigate to next sibling (John)
3. Press → again → navigate to next sibling (Jane)
4. Press ← to go back to previous sibling
```

### Example 3: Expand and Explore a Family Line
```
1. Click on person to select
2. Press + to expand their descendants
3. Press ↓ to navigate to first child
4. Repeat steps 2-3 to explore deeper
5. Press - to collapse when done
```

### Example 4: Edit Multiple People
```
1. Click first person to select
2. Press E to edit
3. Make changes and close
4. Press ↓ to go to child
5. Press E to edit child
6. Continue with other family members
```

### Example 5: Quick Add Family Members
```
1. Click grandparent to select
2. Press ↓ to go to parent
3. Press A to open Add Relative dialog
4. Add spouse, then children
5. Use arrows to navigate to newly added members
6. Press A to add relatives to them
```

## Layout Orientation Differences

### Vertical Layout (Default)
```
       Grandparent
            |
         Parent
            |
     ┌──────┼──────┐
     |      |      |
  Child1  Child2  Child3

Navigation:
  ↑ = Parent     ↓ = First Child
  ← = Left Sib   → = Right Sib
```

### Horizontal Layout
```
Grandparent - Parent - Child1
                    |
                  Child2
                    |
                  Child3

Navigation:
  ← = Parent     → = First Child
  ↑ = Up Sib     ↓ = Down Sib
```

## State Indicators

### Selection Visual Feedback
- **Selected Node**: Highlighted circle with accent color
- **Current Context**: Node remains highlighted during keyboard navigation
- **Available Actions**: Edit (E) and Add Relative (A) only work with selected node

### Tree State
- **Expanded**: All descendants visible, clickable
- **Collapsed**: Descendants hidden, expand with + key
- **Leaf Node**: No children, - key has no effect

## Hands-On Practice

### Beginner: Basic Navigation
1. Click any person in the tree
2. Press arrow keys slowly to navigate
3. Notice how selection moves between relatives
4. Press Esc to deselect and try again

### Intermediate: Quick Editing
1. Select a person with arrow keys
2. Press E to edit their details
3. Close the edit drawer
4. Press ↓ to go to a child
5. Press E again to edit that person

### Advanced: Efficient Data Entry
1. Click on a person to start
2. Press A to add a new relative
3. Add spouse and children through dialog
4. Use arrow keys to navigate to newly added people
5. Press E to edit their details
6. Press A to add relatives to them
7. Repeat for entire family

## Troubleshooting

### Arrows Not Working
- **Issue**: Arrow keys might not navigate
- **Solution**: Make sure you've selected a person first by clicking or pressing Space
- **Verify**: Check that the node has a highlight color

### E and A Keys Not Responding
- **Issue**: Edit and Add Relative shortcuts don't work
- **Solution**: These keys require a selected person. Use arrow keys or click to select first
- **Verify**: Look for the selection highlight on a node

### Keyboard Input Ignored
- **Issue**: Shortcuts ignored while working
- **Solution**: Keyboard input is intentionally disabled while typing in forms/inputs
- **Verify**: Click on the tree canvas area (not on form fields) before using shortcuts

### Expand/Collapse Not Working
- **Issue**: Plus/Minus keys don't expand or collapse
- **Solution**: Plus key only works on parents, Minus on parents with expanded children
- **Verify**: Select a person with children and try again

## Accessibility Features

✓ **Full Keyboard Support**: Navigate entire tree without mouse
✓ **Logical Key Mapping**: Shortcuts follow standard conventions
✓ **Descriptive Help**: In-app documentation of all shortcuts
✓ **Standard Conventions**: Esc for cancel, Enter for confirm
✓ **Intuitive Mnemonics**: E for Edit, A for Add

## Performance Tips

- Use arrow keys for rapid navigation in large trees
- Keyboard shortcuts are faster than mouse for repetitive tasks
- Collapse branches you're not working on with - key
- Use E and A keys to avoid drawer switching

## Keyboard Shortcut Summary Card

```
QUICK REFERENCE CARD
│═══════════════════════════════════════════════════════════│
│                  GENEALOGICAL TREE KEYBOARD CONTROLS     │
│═══════════════════════════════════════════════════════════│
│
│ NAVIGATION:    Arrow Keys (↑↓←→) - Move between relatives
│ SELECT:        Enter / Space - Confirm selection
│ DESELECT:      Esc - Clear selection
│ EXPAND:        + Key - Show all descendants
│ COLLAPSE:      - Key - Hide descendants
│ EDIT:          E Key - Modify person details
│ ADD:           A Key - Add new family member
│
│ Note: E and A keys require a selected person
│
│═══════════════════════════════════════════════════════════│
```

## Print This Guide

You can print this page or save it as a reference while using the genealogical tree application. All keyboard shortcuts are also available in the "How to Use" sidebar within the application.

