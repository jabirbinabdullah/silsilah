import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RelationshipManager } from '../components/RelationshipManager';
import { GenealogyCommandBus } from '../commands/genealogyCommands';


import { vi } from 'vitest';
// Mock PersonSearch to simplify testing
vi.mock('../components/PersonSearch', () => ({
  PersonSearch: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <div>
      <button onClick={() => onSelect('P2')}>Select P2</button>
    </div>
  ),
}));

describe('RelationshipManager Integration', () => {
  const baseProps = {
    treeId: 'tree1',
    open: true,
    onClose: vi.fn(),
    nodes: [
      { id: 'P1', displayName: 'Person 1' },
      { id: 'P2', displayName: 'Person 2' },
    ],
    currentPersonId: 'P1',
    onCreated: vi.fn(),
    onCreateSpouse: vi.fn().mockResolvedValue({}),
    currentParents: [],
    currentChildren: [],
    currentSpouses: [],
    edges: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    vi.spyOn(GenealogyCommandBus, 'addParentChildRelationship').mockResolvedValue({
      success: true,
      data: { message: 'ok' },
    });

    vi.spyOn(GenealogyCommandBus, 'addPerson').mockResolvedValue({
      success: true,
      data: { personId: 'generated-person' },
    });
  });

  test('adds a parent relationship successfully', async () => {
    render(<RelationshipManager {...baseProps} />);
    
    // 1. Select "Parent" type (default, but explicit check)
    const parentTypeBtn = screen.getByRole('button', { name: /^Parent$/i });
    await userEvent.click(parentTypeBtn);

    // 2. Select existing person P2 via mocked PersonSearch
    await userEvent.click(screen.getByText('Select P2'));

    // 3. Click Link Selected
    const linkBtn = screen.getByRole('button', { name: /Link Selected/i });
    await userEvent.click(linkBtn);

    // 4. Verify success message and callback
    await waitFor(() => {
      expect(screen.getByText(/Parent added successfully/i)).toBeInTheDocument();
    });
    expect(baseProps.onCreated).toHaveBeenCalledWith('P1');
  });

  test('adds a child relationship successfully', async () => {
    render(<RelationshipManager {...baseProps} />);
    
    // 1. Select "Child" type
    const childTypeBtn = screen.getByRole('button', { name: /^Child$/i });
    await userEvent.click(childTypeBtn);

    // 2. Select existing person P2
    await userEvent.click(screen.getByText('Select P2'));

    // 3. Click Link Selected
    const linkBtn = screen.getByRole('button', { name: /Link Selected/i });
    await userEvent.click(linkBtn);

    // 4. Verify success message
    await waitFor(() => {
      expect(screen.getByText(/Child added successfully/i)).toBeInTheDocument();
    });
    expect(baseProps.onCreated).toHaveBeenCalledWith('P2'); // Focus shifts to child
  });

  test('creates new person and links as spouse', async () => {
    // Ensure person creation returns expected ID
    (GenealogyCommandBus.addPerson as vi.Mock).mockResolvedValueOnce({
      success: true,
      data: { personId: 'new-spouse' },
    });

    render(<RelationshipManager {...baseProps} />);

    // 1. Select "Spouse" type
    const spouseTypeBtn = screen.getByRole('button', { name: /^Spouse$/i });
    await userEvent.click(spouseTypeBtn);


    // 2. Fill new person form (use roles since labels lack htmlFor)
    const textboxes = screen.getAllByRole('textbox');
    // Person ID is first, Full Name is second
    await userEvent.type(textboxes[0], 'new-spouse');
    await userEvent.type(textboxes[1], 'New Spouse');
    await userEvent.selectOptions(screen.getByRole('combobox'), 'FEMALE');

    // 3. Click Create and Link
    const createBtn = screen.getByRole('button', { name: /Create and Link/i });
    await userEvent.click(createBtn);

    // 4. Verify API calls and success
    await waitFor(() => {
      expect(screen.getByText(/Spouse relationship created successfully/i)).toBeInTheDocument();
    });
    expect(baseProps.onCreateSpouse).toHaveBeenCalledWith('tree1', {
      personAId: 'P1',
      personBId: 'new-spouse',
    });
  });

  test('handles API error gracefully', async () => {
    (GenealogyCommandBus.addParentChildRelationship as vi.Mock).mockResolvedValueOnce({
      success: false,
      error: 'Server is having trouble. Please try again shortly.',
    });

    render(<RelationshipManager {...baseProps} />);
    
    await userEvent.click(screen.getByText('Select P2'));
    await userEvent.click(screen.getByRole('button', { name: /Link Selected/i }));

    await waitFor(() => {
      expect(screen.getByText(/Server is having trouble/i)).toBeInTheDocument();
    });
  });
});
