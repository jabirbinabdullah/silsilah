/**
 * Styling Strategy Enforcement Utilities
 * 
 * This module provides tools to enforce the styling policy:
 * - Bootstrap for structure + data display
 * - Tailwind for drawers, overlays, interactive UI
 * - NO MIXING of frameworks in a single component
 * 
 * @module stylingPolicy
 * @see docs/STYLING_STRATEGY.md
 */

/**
 * Bootstrap Utility Classes Registry
 * 
 * Use these constants to ensure you're using only Bootstrap in a component.
 * If you need Tailwind, create a separate component.
 * 
 * @example
 * // ✅ CORRECT: Pure Bootstrap component
 * <div className={`${BS.container} ${BS.mt4}`}>
 *   <table className={BS.table}>...</table>
 * </div>
 */
export const BootstrapClasses = {
  // Layout
  container: 'container',
  containerFluid: 'container-fluid',
  row: 'row',
  col: 'col',
  colMd: 'col-md',
  colLg: 'col-lg',
  
  // Spacing (margin/padding)
  m0: 'm-0',
  m1: 'm-1',
  m2: 'm-2',
  m3: 'm-3',
  m4: 'm-4',
  mt2: 'mt-2',
  mt3: 'mt-3',
  mt4: 'mt-4',
  mb2: 'mb-2',
  mb3: 'mb-3',
  mb4: 'mb-4',
  p2: 'p-2',
  p3: 'p-3',
  p4: 'p-4',
  px3: 'px-3',
  py3: 'py-3',
  px4: 'px-4',
  py4: 'py-4',
  
  // Tables
  table: 'table',
  tableHover: 'table-hover',
  tableResponsive: 'table-responsive',
  
  // Forms
  formLabel: 'form-label',
  formControl: 'form-control',
  formGroup: 'form-group',
  formCheck: 'form-check',
  formCheckInput: 'form-check-input',
  formCheckLabel: 'form-check-label',
  
  // Buttons
  btn: 'btn',
  btnPrimary: 'btn btn-primary',
  btnSecondary: 'btn btn-secondary',
  btnSuccess: 'btn btn-success',
  btnDanger: 'btn btn-danger',
  btnWarning: 'btn btn-warning',
  btnInfo: 'btn btn-info',
  btnSmall: 'btn-sm',
  btnLarge: 'btn-lg',
  
  // Alerts
  alert: 'alert',
  alertDanger: 'alert alert-danger',
  alertSuccess: 'alert alert-success',
  alertInfo: 'alert alert-info',
  alertWarning: 'alert alert-warning',
  
  // Cards
  card: 'card',
  cardHeader: 'card-header',
  cardBody: 'card-body',
  cardFooter: 'card-footer',
  
  // Modals & Offcanvas
  modal: 'modal',
  modalContent: 'modal-content',
  modalHeader: 'modal-header',
  modalBody: 'modal-body',
  modalFooter: 'modal-footer',
  offcanvas: 'offcanvas',
  offcanvasEnd: 'offcanvas-end',
  offcanvasBody: 'offcanvas-body',
  
  // Display
  dFlex: 'd-flex',
  justifyContentCenter: 'justify-content-center',
  justifyContentEnd: 'justify-content-end',
  alignItemsCenter: 'align-items-center',
  flexGrow1: 'flex-grow-1',
  
  // Text
  textCenter: 'text-center',
  textEnd: 'text-end',
  textMuted: 'text-muted',
  textDanger: 'text-danger',
  textSuccess: 'text-success',
  
  // Borders
  borderBottom: 'border-bottom',
  borderTop: 'border-top',
  
  // Other
  spinner: 'spinner-border',
  badge: 'badge',
  hidden: 'd-none',
  visible: 'd-block',
} as const;

/**
 * Tailwind Utility Classes Registry
 * 
 * Use these constants to ensure you're using only Tailwind in a component.
 * If you need Bootstrap, create a separate component.
 * 
 * @example
 * // ✅ CORRECT: Pure Tailwind component
 * <div className={`${TW.fixed} ${TW.inset0} ${TW.bgBlack30}`}>
 *   <div className={TW.rounded}>...</div>
 * </div>
 */
export const TailwindClasses = {
  // Layout
  fixed: 'fixed',
  absolute: 'absolute',
  relative: 'relative',
  inset0: 'inset-0',
  top0: 'top-0',
  left0: 'left-0',
  right0: 'right-0',
  bottom0: 'bottom-0',
  zeroLevel: 'z-0',
  z10: 'z-10',
  z20: 'z-20',
  z50: 'z-50',
  
  // Flex
  flex: 'flex',
  flexCol: 'flex-col',
  flexRow: 'flex-row',
  items: 'items-center',
  justify: 'justify-center',
  justifyBetween: 'justify-between',
  justifyEnd: 'justify-end',
  
  // Sizing
  w: (val: string) => `w-${val}`,
  h: (val: string) => `h-${val}`,
  wFull: 'w-full',
  hFull: 'h-full',
  wScreen: 'w-screen',
  hScreen: 'h-screen',
  
  // Spacing
  p: (val: string) => `p-${val}`,
  m: (val: string) => `m-${val}`,
  gap: (val: string) => `gap-${val}`,
  
  // Colors & Backgrounds
  bg: (val: string) => `bg-${val}`,
  bgBlack: 'bg-black',
  bgBlack30: 'bg-black/30',
  bgWhite: 'bg-white',
  bgGray: 'bg-gray-100',
  text: (val: string) => `text-${val}`,
  textGray: 'text-gray-500',
  
  // Borders & Shadows
  rounded: 'rounded',
  roundedLg: 'rounded-lg',
  shadow: 'shadow',
  shadowXl: 'shadow-xl',
  border: 'border',
  borderGray: 'border-gray-300',
  
  // Typography
  text2xl: 'text-2xl',
  fontBold: 'font-bold',
  
  // Interactive
  hover: 'hover:',
  transition: 'transition',
  cursor: 'cursor-pointer',
  opacity: (val: string) => `opacity-${val}`,
} as const;

/**
 * Component Styling Validator
 * 
 * Use this at component definition to document which framework is in use.
 * Helps future developers understand the styling strategy.
 * 
 * @example
 * // ✅ Pure Bootstrap component
 * @StylePolicy('BOOTSTRAP')
 * export const PersonForm: React.FC = () => { ... }
 * 
 * @example
 * // ✅ Pure Tailwind component
 * @StylePolicy('TAILWIND')
 * export const CustomDrawer: React.FC = () => { ... }
 */
export function StylePolicy(framework: 'BOOTSTRAP' | 'TAILWIND' | 'COMPOSITE') {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    // Store metadata
    (constructor as any).__styleFramework = framework;
    return constructor;
  };
}

/**
 * Verify a component uses only one styling framework
 * 
 * @internal
 * This is for documentation and future automated checking.
 * Currently not enforced at runtime, but provides a pattern
 * for future ESLint rules or build-time validation.
 * 
 * @example
 * verifyPureStyled(PersonForm, 'BOOTSTRAP');
 */
export function verifyPureStyled(
  component: React.ComponentType<any>,
  expectedFramework: 'BOOTSTRAP' | 'TAILWIND'
): boolean {
  const framework = (component as any).__styleFramework;
  if (!framework) return true; // Not decorated, can't verify
  return framework === expectedFramework || framework === 'COMPOSITE';
}

/**
 * Helper to combine Bootstrap classes safely
 * 
 * Prevents accidental Tailwind mixing by using explicit registry.
 * 
 * @example
 * const classes = mergeBootstrapClasses(
 *   BS.container,
 *   BS.mt4,
 *   BS.mb3
 * );
 * <div className={classes}>...</div>
 */
export function mergeBootstrapClasses(...classes: (string | undefined | null)[]): string {
  return classes
    .filter((cls): cls is string => Boolean(cls))
    .join(' ');
}

/**
 * Helper to combine Tailwind classes safely
 * 
 * Prevents accidental Bootstrap mixing by using explicit registry.
 * 
 * @example
 * const classes = mergeTailwindClasses(
 *   TW.fixed,
 *   TW.inset0,
 *   TW.bgBlack30
 * );
 * <div className={classes}>...</div>
 */
export function mergeTailwindClasses(...classes: (string | undefined | null)[]): string {
  return classes
    .filter((cls): cls is string => Boolean(cls))
    .join(' ');
}

/**
 * Styling Policy Enforcement Rules
 * 
 * Document which components follow which strategy
 */
export const COMPONENT_FRAMEWORK_MAPPING = {
  // Bootstrap: Structure & Data Display
  'ExportModal.tsx': 'BOOTSTRAP',
  'ImportModal.tsx': 'BOOTSTRAP',
  'CreateTreeModal.tsx': 'BOOTSTRAP',
  'PersonForm.tsx': 'BOOTSTRAP',
  'AddPersonDrawer.tsx': 'BOOTSTRAP',
  'EditPersonDrawer.tsx': 'BOOTSTRAP',
  'MergeDialog.tsx': 'BOOTSTRAP',
  'RenameTreeModal.tsx': 'BOOTSTRAP',
  'ChangeDescriptionModal.tsx': 'BOOTSTRAP',
  'DeleteTreeModal.tsx': 'BOOTSTRAP',
  
  // Tailwind: Interactive Overlays
  'HierarchicalTreeCanvas.tsx': 'TAILWIND',
  'TimelineView.tsx': 'TAILWIND',
  'KeyboardHintsPanel.tsx': 'TAILWIND',
  'CompactActivityFeed.tsx': 'TAILWIND',
  
  // Composite: Delegates to subcomponents
  'TreeViewer.tsx': 'COMPOSITE',
  'RelationshipManager.tsx': 'COMPOSITE',
  'PersonDetailsDrawer.tsx': 'COMPOSITE',
} as const;

/**
 * Anti-Pattern Detection Helpers
 * 
 * These patterns should never appear in your components.
 */
export const ANTI_PATTERNS = {
  /**
   * Check if a className string contains mixed frameworks
   * (Basic heuristic, not perfect)
   * 
   * @example
   * const isMixed = ANTI_PATTERNS.detectMixing(
   *   'container btn-primary hover:bg-blue-500'
   * );
   * // returns true (btn-primary is Bootstrap, hover: is Tailwind)
   */
  detectMixing(className: string): boolean {
    const bootstrapPatterns = /\b(btn|table|form-|alert|card|modal|offcanvas|col-|row|container|navbar)\b/;
    const tailwindPatterns = /\b(fixed|absolute|inset-|flex|hover:|group-|w-|h-|bg-|text-\w+-\d+)\b/;
    
    const hasBootstrap = bootstrapPatterns.test(className);
    const hasTailwind = tailwindPatterns.test(className);
    
    return hasBootstrap && hasTailwind;
  },
  
  /**
   * Report common mixing mistakes
   * 
   * @example
   * ANTI_PATTERNS.reportIssues('container p-4 btn btn-primary text-blue-500');
   */
  reportIssues(className: string): string[] {
    const issues: string[] = [];
    
    if (className.includes('container') && className.includes('w-')) {
      issues.push('Container (Bootstrap) mixed with w-* utilities (Tailwind)');
    }
    if (className.includes('btn') && className.includes('hover:')) {
      issues.push('Button styling (Bootstrap) mixed with hover: utilities (Tailwind)');
    }
    if (className.includes('table') && className.includes('px-')) {
      issues.push('Table styling (Bootstrap) mixed with px-* utilities (Tailwind)');
    }
    if (className.includes('form-control') && className.includes('border-gray-')) {
      issues.push('Form controls (Bootstrap) mixed with border utilities (Tailwind)');
    }
    
    return issues;
  }
};
