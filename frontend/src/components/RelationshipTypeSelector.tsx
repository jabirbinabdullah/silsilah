import React, { useMemo } from 'react';
import type { RenderEdgeData } from '../api';

export type ExtendedRelationshipType =
  | 'parent'
  | 'child'
  | 'spouse'
  | 'adoptive-parent'
  | 'step-parent'
  | 'step-child';

type FamilyNode = { personId: string; displayName: string };

type RelationshipTypeSelectorProps = {
  currentPersonId: string;
  selectedOtherId?: string | null;
  parents: FamilyNode[];
  children: FamilyNode[];
  spouses: FamilyNode[];
  edges: RenderEdgeData[];
  value: ExtendedRelationshipType;
  onChange: (type: ExtendedRelationshipType) => void;
};

function buildSets(currentId: string, edges: RenderEdgeData[]) {
  const parentOf = new Map<string, Set<string>>(); // parent -> children
  const childOf = new Map<string, Set<string>>(); // child -> parents
  for (const e of edges) {
    if (e.type !== 'parent-child') continue;
    if (!parentOf.has(e.source)) parentOf.set(e.source, new Set());
    parentOf.get(e.source)!.add(e.target);
    if (!childOf.has(e.target)) childOf.set(e.target, new Set());
    childOf.get(e.target)!.add(e.source);
  }

  const ancestors = new Set<string>();
  const descendants = new Set<string>();

  // BFS up for ancestors
  const upQueue: string[] = [currentId];
  const visitedUp = new Set<string>([currentId]);
  while (upQueue.length) {
    const id = upQueue.shift()!;
    const parents = childOf.get(id);
    if (!parents) continue;
    for (const p of parents) {
      if (!visitedUp.has(p)) {
        ancestors.add(p);
        visitedUp.add(p);
        upQueue.push(p);
      }
    }
  }

  // BFS down for descendants
  const downQueue: string[] = [currentId];
  const visitedDown = new Set<string>([currentId]);
  while (downQueue.length) {
    const id = downQueue.shift()!;
    const kids = parentOf.get(id);
    if (!kids) continue;
    for (const c of kids) {
      if (!visitedDown.has(c)) {
        descendants.add(c);
        visitedDown.add(c);
        downQueue.push(c);
      }
    }
  }

  return { ancestors, descendants };
}

export const RelationshipTypeSelector: React.FC<RelationshipTypeSelectorProps> = ({
  currentPersonId,
  selectedOtherId,
  parents,
  children,
  spouses,
  edges,
  value,
  onChange,
}) => {
  const { ancestors, descendants } = useMemo(
    () => buildSets(currentPersonId, edges),
    [currentPersonId, edges]
  );

  const parentCount = parents.length;
  const isOtherParent = selectedOtherId ? parents.some((p) => p.personId === selectedOtherId) : false;
  const isOtherChild = selectedOtherId ? children.some((c) => c.personId === selectedOtherId) : false;
  const isOtherSpouse = selectedOtherId ? spouses.some((s) => s.personId === selectedOtherId) : false;
  const isOtherAncestor = selectedOtherId ? ancestors.has(selectedOtherId) : false;
  const isOtherDescendant = selectedOtherId ? descendants.has(selectedOtherId) : false;

  const options: Array<{
    key: ExtendedRelationshipType;
    label: string;
    desc: string;
    disabled: boolean;
    tooltip?: string;
    style?: React.CSSProperties;
  }> = [
    {
      key: 'parent',
      label: 'Parent',
      desc: 'Biological parent of current person.',
      disabled:
        parentCount >= 2 ||
        isOtherParent ||
        isOtherSpouse ||
        isOtherDescendant, // would create a cycle
      tooltip:
        parentCount >= 2
          ? 'Maximum two biological parents reached.'
          : isOtherParent
          ? 'Selected person is already a parent.'
          : isOtherSpouse
          ? 'Cannot add spouse as parent.'
          : isOtherDescendant
          ? 'Cannot add a descendant as parent (cycle).'
          : undefined,
    },
    {
      key: 'child',
      label: 'Child',
      desc: 'Biological child of current person.',
      disabled: isOtherChild || isOtherSpouse || isOtherAncestor, // cycle if ancestor becomes child
      tooltip:
        isOtherChild
          ? 'Selected person is already a child.'
          : isOtherSpouse
          ? 'Cannot add spouse as child.'
          : isOtherAncestor
          ? 'Cannot add an ancestor as child (cycle).'
          : undefined,
    },
    {
      key: 'spouse',
      label: 'Spouse',
      desc: 'Marriage relationship.',
      disabled: isOtherSpouse || isOtherParent || isOtherChild,
      tooltip:
        isOtherSpouse
          ? 'Selected person is already a spouse.'
          : isOtherParent
          ? 'Cannot add parent as spouse.'
          : isOtherChild
          ? 'Cannot add child as spouse.'
          : undefined,
    },
    {
      key: 'adoptive-parent',
      label: 'Adoptive Parent',
      desc: 'Legal parent (non-biological).',
      disabled: true,
      tooltip: 'Adoptive relationships are not yet supported.',
      style: { borderStyle: 'dotted' },
    },
    {
      key: 'step-parent',
      label: 'Step-Parent',
      desc: 'Parent by marriage (non-biological).',
      disabled: true,
      tooltip: 'Step-parent relationships are not yet supported.',
      style: { borderStyle: 'dashed' },
    },
    {
      key: 'step-child',
      label: 'Step-Child',
      desc: 'Child by marriage (non-biological).',
      disabled: true,
      tooltip: 'Step-child relationships are not yet supported.',
      style: { borderStyle: 'dashed' },
    },
  ];

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`btn btn-sm ${value === opt.key ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={opt.style}
            disabled={opt.disabled}
            title={opt.tooltip || opt.desc}
            onClick={() => onChange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="text-muted small">
        <p className="mb-1"><strong>Parent</strong>: A biological parent. Max two parents enforced.</p>
        <p className="mb-1"><strong>Child</strong>: A biological child of the current person.</p>
        <p className="mb-1"><strong>Spouse</strong>: Marriage relationship. Cannot be both a parent or child.</p>
        <p className="mb-1"><strong>Adoptive/Step</strong>: Displayed for clarity, creation not yet supported.</p>
        {spouses.length > 0 && (
          <p className="mb-1">Existing spouses: {spouses.map((s) => s.displayName).join(', ')}</p>
        )}
      </div>
    </div>
  );
};
