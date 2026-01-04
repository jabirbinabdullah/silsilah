import React from 'react';
import { render, screen } from '@testing-library/react';
import { RelationshipTypeSelector } from '../components/RelationshipTypeSelector';
import type { RenderEdgeData } from '../api';

function makeEdges(pairs: Array<[string, string, 'parent-child' | 'spouse']>): RenderEdgeData[] {
  return pairs.map(([source, target, type], i) => ({ id: `e${i}`, source, target, type }));
}

describe('RelationshipTypeSelector validation', () => {
  const baseProps = {
    currentPersonId: 'A',
    selectedOtherId: null,
    parents: [],
    children: [],
    spouses: [],
    edges: [] as RenderEdgeData[],
    value: 'parent' as const,
    onChange: () => {},
  };

  test('disables parent when two parents already exist', () => {
    const props = {
      ...baseProps,
      parents: [ { personId: 'P1', displayName: 'P1' }, { personId: 'P2', displayName: 'P2' } ],
    };
    render(<RelationshipTypeSelector {...props} />);
    const parentBtn = screen.getByRole('button', { name: /^Parent$/i });
    expect(parentBtn).toBeDisabled();
  });

  test('prevents cycle: cannot add descendant as parent', () => {
    const edges = makeEdges([
      ['A', 'B', 'parent-child'], // A -> B (B is descendant)
    ]);
    render(<RelationshipTypeSelector {...baseProps} selectedOtherId={'B'} edges={edges} />);
    const parentBtn = screen.getByRole('button', { name: /^Parent$/i });
    expect(parentBtn).toBeDisabled();
    expect(parentBtn).toHaveAttribute('title', expect.stringMatching(/cycle/i));
  });

  test('prevents cycle: cannot add ancestor as child', () => {
    const edges = makeEdges([
      ['X', 'A', 'parent-child'], // X is ancestor of A
    ]);
    render(<RelationshipTypeSelector {...baseProps} selectedOtherId={'X'} edges={edges} value={'child'} />);
    const childBtn = screen.getByRole('button', { name: /^Child$/i });
    expect(childBtn).toBeDisabled();
    expect(childBtn).toHaveAttribute('title', expect.stringMatching(/ancestor/i));
  });

  test('disables spouse when already spouse', () => {
    const props = {
      ...baseProps,
      spouses: [ { personId: 'S1', displayName: 'S1' } ],
      selectedOtherId: 'S1',
    };
    render(<RelationshipTypeSelector {...props} value={'spouse'} />);
    const spouseBtn = screen.getByRole('button', { name: /^Spouse$/i });
    expect(spouseBtn).toBeDisabled();
    expect(spouseBtn).toHaveAttribute('title', expect.stringMatching(/already a spouse/i));
  });
});
