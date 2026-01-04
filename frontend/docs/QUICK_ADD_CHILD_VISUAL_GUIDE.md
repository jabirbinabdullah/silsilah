# Quick Add Child - Feature Guide

## Visual Overview

### 1. PersonDetailsDrawer with Quick Add Child Button

```
┌─────────────────────────────────────────────────────┐
│ John Smith                    [+ Child] [Focus] [+] │  ← Quick Add Button
├─────────────────────────────────────────────────────┤
│                                                       │
│ Details                                              │
│ ├─ Gender: Male                                      │
│ ├─ Born: Jan 1, 1950                                 │
│ └─ Died: Dec 15, 2020                                │
│                                                       │
│ Family                                               │
│ ├─ [+ Quick Child] [+ Add Relative]                 │ ← Also in Family section
│ ├─ Parents: None                                     │
│ ├─ Children:                                         │
│ │  ├─ Sarah Smith (1975)                            │
│ │  └─ Michael Smith (1978)                          │
│ └─ Spouses:                                          │
│    └─ Mary Smith (1952)                             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 2. Mini-Form After Quick Add

```
┌─────────────────────────────────────────────────────┐
│ ✓ Quick Add Child - Edit Details                    │
├─────────────────────────────────────────────────────┤
│                                                       │
│ Child Name                                           │
│ [Child of John Smith________________]  ← Auto-filled │
│                                                       │
│ Gender                                               │
│ [Unknown ▼]  ← Options: Unknown/Male/Female         │
│                                                       │
│ [✓ Done Editing] [× Close]                           │
│                                                       │
│ 💡 The child has been created with a biological    │
│    parent-child relationship. Edit the details       │
│    above and click "Done Editing" to save.          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 3. Tree Updates Automatically

```
Before:                              After Quick Add:
                                    
┌─────────┐                         ┌─────────┐
│ John    │                         │ John    │
│ Smith   │                         │ Smith   │
├─────────┤                         ├─────────┤
│ Sarah   │                         │ Sarah   │
│ Michael │                         │ Michael │
│         │                         │ Child   │ ← New!
└─────────┘                         └─────────┘
```

## Usage Flow Diagram

```
                    User in Tree Viewer
                           │
                           ↓
                  Click on Person Node
                           │
                           ↓
        PersonDetailsDrawer Opens with Info
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
    [+ Child]         [Focus]          [Edit]
        │
        ↓
   Loading State (API call)
        │
        ├─→ createPerson() → Child person created
        │                    ID: person-{timestamp}
        │                    Name: "Child of {Parent}"
        │
        ├─→ establishParentChild() → Relationship created
        │                            Type: "parent-child"
        │
        ↓
   Mini-Form Opens
        │
   ┌────┴────┬──────────┐
   ↓         ↓          ↓
 Edit Name  Edit Gender  Done
   │         │          │
   └─────────┴──────────┘
             │
             ↓
         Close Form
             │
             ↓
    Tree Visualization Updates
    Child appears in tree
    Callback fires
    Done!
```

## Button States

### Header "+ Child" Button

| State | Appearance | Action |
|-------|-----------|--------|
| **Ready** | Green button "[ + Child ]" | Clickable, opens form |
| **Loading** | Green button with spinner "[ ↻ Adding... ]" | Disabled, shows progress |
| **No Parent** | Gray button "[ + Child ]" | Disabled, greyed out |
| **Error** | Red alert message | Try again button available |

### Family Section Buttons

```
Family Section
├─ [+ Quick Child]    ← Single-click quick add
├─ [+ Add Relative]   ← Multi-step relationship creation
└─ Family List
```

## Data Flow

```
┌──────────────────────────────────────────────────┐
│ PersonDetailsDrawer Component                    │
├──────────────────────────────────────────────────┤
│                                                  │
│  handleQuickAddChild()                           │
│  │                                               │
│  ├─→ generateChildName(person.name)             │
│  │   Returns: "Child of John Smith"              │
│  │                                               │
│  ├─→ createPerson(treeId, {                      │
│  │     personId: "person-{id}",                  │
│  │     name: "Child of John Smith",              │
│  │     gender: "UNKNOWN",                        │
│  │     ...                                       │
│  │   })                                          │
│  │                                               │
│  ├─→ establishParentChild(treeId, {              │
│  │     parentId: personId,                       │
│  │     childId: newPersonId                      │
│  │   })                                          │
│  │                                               │
│  ├─→ setChildFormOpen(true)                      │
│  │   Opens mini-form for editing                 │
│  │                                               │
│  ├─→ onChildAdded(childId)                       │
│  │   Callback to parent component                │
│  │                                               │
│  └─→ onRefresh()                                 │
│      Trigger tree visualization refresh          │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Component Hierarchy

```
TreeViewer
├── TreeCanvas
├── PersonDetailsDrawer ← This component
│   ├── Mini-Form Card (conditional)
│   │   ├── Child Name Input
│   │   ├── Gender Select
│   │   └── Action Buttons
│   ├── Person Details Section
│   └── PersonRelationships
│       ├── Parents List
│       ├── Children List
│       └── Spouses List
└── Other Components...
```

## State Management

```
PersonDetailsDrawer State:

┌─────────────────────────────────────────┐
│ Loading States                          │
├─────────────────────────────────────────┤
│ loading: boolean                        │ ← Fetching person details
│ error: string | null                    │ ← Error messages
│ creatingChild: boolean                  │ ← Creating new child
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Form States                             │
├─────────────────────────────────────────┤
│ childFormOpen: boolean                  │ ← Mini-form visibility
│ newChildName: string                    │ ← Child name input
│ newChildGender: 'MALE'|'FEMALE'|'UNK'  │ ← Gender selection
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Fetched Data                            │
├─────────────────────────────────────────┤
│ person: PersonDetails | null            │ ← Current person
│ parents: FamilyNode[]                   │ ← Parent nodes
│ children: FamilyNode[]                  │ ← Child nodes
│ spouses: FamilyNode[]                   │ ← Spouse nodes
└─────────────────────────────────────────┘
```

## API Calls

### 1. Create Person

```typescript
POST /trees/{treeId}/persons

Request Body:
{
  personId: "person-1703594800000-a7c4b2e1",
  name: "Child of John Smith",
  gender: "UNKNOWN",
  birthDate: null,
  birthPlace: null,
  deathDate: null
}

Response:
{
  personId: "person-1703594800000-a7c4b2e1"
}
```

### 2. Establish Parent-Child Relationship

```typescript
POST /trees/{treeId}/relationships/parent-child

Request Body:
{
  parentId: "john-smith-123",
  childId: "person-1703594800000-a7c4b2e1"
}

Response:
{
  message: "Parent-child relationship established"
}
```

## Error Handling

```
Error Scenarios:

1. Network Error
   └─→ Display: "Failed to create child: Network error"
       Action: User can retry

2. Invalid Parent ID
   └─→ Display: "Failed to create child: Invalid parent"
       Action: Check person ID validity

3. Person Already Exists
   └─→ Display: "Failed to create child: Person exists"
       Action: Use unique ID generation

4. Relationship Failed
   └─→ Display: "Failed to create child: Relationship error"
       Action: Person created but relationship failed
```

## Performance Characteristics

```
Operation Timing:
├─ generateChildName()      → ~0.1ms (synchronous)
├─ createPerson() API       → ~100-300ms (network)
├─ establishParentChild()   → ~100-300ms (network)
├─ setChildFormOpen()       → ~0.2ms (state update)
└─ Total Time               → ~200-600ms (typical)

Optimizations:
├─ Async API calls don't block UI
├─ Debounced state updates
├─ Early UI feedback (spinner)
└─ Optimistic updates
```

## Accessibility

```
♿ Accessibility Features:

Button Labels:
├─ aria-label: "Quick add child with auto-generated name"
└─ title: Tooltip text

Form Elements:
├─ <label htmlFor="childName"> Child Name
├─ <label htmlFor="childGender"> Gender
└─ Proper associations

Loading Feedback:
├─ aria-hidden="true" on spinner
├─ Role attributes
└─ Text alternatives

Keyboard Navigation:
├─ Tab through buttons
├─ Tab through form fields
└─ Enter to submit (can be added)
```

---

**Quick Reference**: 
- **Location**: PersonDetailsDrawer (header and family section)
- **Button Text**: "+ Child" or "+ Quick Child"
- **Color**: Green (success) button
- **Action**: Single-click creates child with auto-generated name
- **Result**: Mini-form opens for immediate editing
- **Effect**: Tree updates instantly with new parent-child relationship
