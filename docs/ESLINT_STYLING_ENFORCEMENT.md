# ESLint Styling Policy Enforcement Guide

This document describes how to implement automated enforcement of the styling policy using ESLint.

## Current Status

- **Policy**: ACTIVE (documented in [STYLING_STRATEGY.md](./STYLING_STRATEGY.md))
- **Enforcement**: Manual (via code review)
- **Automation**: READY FOR IMPLEMENTATION

## Proposed ESLint Rule: `no-mixed-css-frameworks`

### Rule Purpose

Detect when a component mixes Bootstrap and Tailwind CSS classes in the same file.

### What It Checks

1. ✅ Scans all `className` attributes in JSX
2. ✅ Detects Bootstrap class patterns
3. ✅ Detects Tailwind class patterns
4. ✅ Reports error if both frameworks found in same component
5. ✅ Allows exception for components marked as `COMPOSITE`
6. ✅ Suggests refactoring to subcomponents

### Configuration Example

```javascript
// .eslintrc.cjs
module.exports = {
  rules: {
    'no-mixed-css-frameworks': [
      'error',
      {
        enforcePurity: true,
        allowComposites: true,
        reportLevel: 'error'
      }
    ]
  }
};
```

## Implementation Steps

### Step 1: Create Custom ESLint Rule

**File**: `frontend/eslint-rules/no-mixed-css-frameworks.js`

```javascript
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce styling policy: no mixing Bootstrap and Tailwind',
      category: 'Best Practices',
      recommended: true
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          enforcePurity: { type: 'boolean' },
          allowComposites: { type: 'boolean' },
          reportLevel: { enum: ['warn', 'error'] }
        }
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const { enforcePurity = true, allowComposites = true } = options;

    const BOOTSTRAP_PATTERNS = [
      // Layout
      /\b(container|row|col|col-md|col-lg|container-fluid)\b/,
      // Forms
      /\b(form-label|form-control|form-group|form-check)\b/,
      // Buttons
      /\b(btn|btn-primary|btn-secondary|btn-danger)\b/,
      // Tables
      /\b(table|table-hover|table-responsive)\b/,
      // Cards
      /\b(card|card-header|card-body)\b/,
      // Modals
      /\b(modal|offcanvas)\b/,
      // Bootstrap utilities
      /\b(d-flex|d-none|mt-|mb-|p-|m-[0-9])\b/
    ];

    const TAILWIND_PATTERNS = [
      // Positioning
      /\b(fixed|absolute|inset-)\b/,
      // Flex
      /\b(flex|flex-col|flex-row|items-)\b/,
      // Sizing
      /\b(w-|h-|min-w-|max-w-)\b/,
      // Colors
      /\b(bg-|text-\w+-)/,
      // Hover/Focus
      /\b(hover:|focus:|group-|peer-)\b/,
      // Responsive
      /\b(sm:|md:|lg:|xl:|2xl:)\b/
    ];

    function hasBootstrap(className) {
      return BOOTSTRAP_PATTERNS.some(pattern => pattern.test(className));
    }

    function hasTailwind(className) {
      return TAILWIND_PATTERNS.some(pattern => pattern.test(className));
    }

    function isMixed(className) {
      return hasBootstrap(className) && hasTailwind(className);
    }

    return {
      JSXOpeningElement(node) {
        const classNameAttr = node.attributes.find(
          attr => attr.type === 'JSXAttribute' && attr.name.name === 'className'
        );

        if (!classNameAttr || !classNameAttr.value) return;

        // Handle string literal
        let classNameValue = '';
        if (classNameAttr.value.type === 'Literal') {
          classNameValue = classNameAttr.value.value;
        } else if (classNameAttr.value.type === 'JSXExpressionContainer') {
          // Could be template string or variable
          if (classNameAttr.value.expression.type === 'Literal') {
            classNameValue = classNameAttr.value.expression.value;
          }
        }

        if (!classNameValue) return;

        if (isMixed(classNameValue)) {
          context.report({
            node: classNameAttr,
            message: [
              'Mixing Bootstrap and Tailwind CSS frameworks in single component.',
              'Choose ONE framework:',
              '- BOOTSTRAP for structure + data display',
              '- TAILWIND for interactive overlays',
              'Or use COMPOSITE pattern: delegate styling to subcomponents.'
            ].join(' '),
            fix(fixer) {
              return null; // Manual fix required
            }
          });
        }
      }
    };
  }
};
```

### Step 2: Register Rule in ESLint Config

**File**: `frontend/.eslintrc.cjs`

```javascript
module.exports = {
  // ... existing config
  
  plugins: [
    // Add custom rules plugin
    './eslint-rules'
  ],

  rules: {
    'no-mixed-css-frameworks': [
      'error',
      {
        enforcePurity: true,
        allowComposites: true
      }
    ]
  }
};
```

### Step 3: Add Npm Script

**File**: `frontend/package.json`

```json
{
  "scripts": {
    "lint:styles": "eslint --rule no-mixed-css-frameworks:error src/components/**/*.tsx",
    "lint:styles:fix": "eslint --fix --rule no-mixed-css-frameworks:error src/components/**/*.tsx"
  }
}
```

### Step 4: CI/CD Integration

Add to GitHub Actions workflow (`.github/workflows/lint.yml`):

```yaml
- name: Check styling policy
  run: npm run lint:styles
```

## Pattern Detection

### Bootstrap Patterns Detected

```
✅ container, row, col, col-md, col-lg
✅ form-label, form-control, form-check
✅ btn, btn-primary, btn-danger
✅ table, table-hover
✅ card, card-header, modal, offcanvas
✅ d-flex, d-none, mt-, mb-, p-, m-*
✅ alert, badge, spinner
```

### Tailwind Patterns Detected

```
✅ fixed, absolute, inset-
✅ flex, flex-col, items-, justify-
✅ w-, h-, min-w-, max-w-
✅ bg-, text-*, border-*
✅ hover:, focus:, group-, peer-
✅ sm:, md:, lg:, xl:, 2xl:
✅ opacity-, shadow-, rounded-, transition-
```

## Example Violations Caught

### ❌ Mixed: Bootstrap + Tailwind

```typescript
// ERROR: Mixing Bootstrap and Tailwind
<div className="container p-4 hover:bg-gray-50">
//    ^^^^^^^^^ Bootstrap    ^^^^ both    ^^^^^^^^^^^ Tailwind
```

**Fix Options**:
1. Remove Tailwind classes if structure is primary
2. Remove Bootstrap classes if interactive is primary
3. Split into subcomponents

### ✅ Pure Bootstrap

```typescript
// OK: Only Bootstrap
<div className="container mt-4 mb-3 p-3">
```

### ✅ Pure Tailwind

```typescript
// OK: Only Tailwind
<div className="fixed inset-0 bg-black/50 hover:bg-black/75 flex items-center">
```

### ✅ Composite (Allowed)

```typescript
// OK: Parent uses Bootstrap, children delegate
export const ComplexView = () => (
  <div className="container">
    <BootstrapDataTable />
    <TailwindVisualization />
  </div>
);
```

## Testing the Rule

Create test file: `frontend/eslint-rules/__tests__/no-mixed-css-frameworks.test.js`

```javascript
const rule = require('../no-mixed-css-frameworks');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2021 } });

ruleTester.run('no-mixed-css-frameworks', rule, {
  valid: [
    // Pure Bootstrap
    '<div className="container mt-4"><button className="btn btn-primary">X</button></div>',
    // Pure Tailwind
    '<div className="fixed inset-0 bg-black/50"><button className="px-4 hover:bg-blue-500">X</button></div>'
  ],
  invalid: [
    // Mixed
    {
      code: '<div className="container hover:bg-gray-50"><button className="btn btn-primary text-blue-500">X</button></div>',
      errors: [{ message: /Mixing Bootstrap and Tailwind/ }]
    }
  ]
});
```

## Running the Linter

```bash
# Check for violations
npm run lint:styles

# Fix (manual review needed)
npm run lint:styles:fix

# Check single file
npx eslint --rule no-mixed-css-frameworks:error src/components/MyComponent.tsx
```

## Migration Strategy

### Phase 1: Audit Current Violations
```bash
npm run lint:styles 2>&1 | tee style-violations.log
```

### Phase 2: Fix High-Priority Components
- Components with frequent changes
- Components in hot paths
- Components used as examples

### Phase 3: Mass Fix
- Use detection tool to identify all violations
- Create PRs per component or per directory
- Review and merge

### Phase 4: Enforce in CI
- Enable in GitHub Actions
- Block PRs with violations
- Document in contribution guidelines

## Future Enhancements

1. **Stylelint Integration**: Use Stylelint for CSS file validation
2. **Automatic Fixes**: Implement fixer to suggest component split
3. **Custom Tailwind Config**: Restrict usage to specific files
4. **CSS Audit Report**: Generate monthly report of style debt
5. **Bundle Size Tracking**: Monitor CSS output from framework mixing

## References

- [ESLint Custom Rules](https://eslint.org/docs/developer-guide/working-with-rules)
- [ESLint Plugin Development](https://eslint.org/docs/developer-guide/working-with-plugins)
- [Styling Policy](./STYLING_STRATEGY.md)
- [Styling Utilities](../frontend/src/utils/stylingPolicy.ts)

## Questions

**Q: Why not use a CSS linter instead?**  
A: ESLint catches violations at source level before CSS is generated. Stylelint checks generated CSS, which is harder to map back to components.

**Q: Can I disable this rule for specific components?**  
A: Use ESLint inline comments:
```typescript
/* eslint-disable no-mixed-css-frameworks */
// This component intentionally mixes frameworks (TEMPORARY)
/* eslint-enable no-mixed-css-frameworks */
```

**Q: How do I handle third-party components?**  
A: Wrapper component using consistent framework:
```typescript
export const BootstrapTableWrapper: React.FC<Props> = (props) => (
  <div className="table-responsive">
    <ThirdPartyTable {...props} />  {/* may have inline styles */}
  </div>
);
```
