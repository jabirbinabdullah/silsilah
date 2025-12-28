/**
 * Demo component for HierarchicalTreeCanvas
 * Tests the new hierarchical tree visualization
 */

import React, { useState, useEffect } from 'react';
import { HierarchicalTreeCanvas } from './HierarchicalTreeCanvas';
import { buildGenealogyHierarchy } from '../utils/genealogyHierarchy';
import type { TreeRenderV1 } from '../api';
import type { GenealogyHierarchyResult } from '../utils/genealogyHierarchy';

export const HierarchicalTreeDemo: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<GenealogyHierarchyResult | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  
  useEffect(() => {
    // Create sample family tree data with spouse relationships
    const sampleData: TreeRenderV1 = {
      version: 'v1',
      treeId: 'demo-tree',
      nodes: [
        { id: 'alice', displayName: 'Alice Smith' },
        { id: 'bob', displayName: 'Bob Smith' },
        { id: 'charlie', displayName: 'Charlie Smith' },
        { id: 'diana', displayName: 'Diana Smith' },
        { id: 'eve', displayName: 'Eve Smith' },
        { id: 'frank', displayName: 'Frank Jones' },
        { id: 'grace', displayName: 'Grace Jones' },
        { id: 'henry', displayName: 'Henry Brown' }, // Alice's spouse
        { id: 'iris', displayName: 'Iris White' }, // Bob's spouse
      ],
      edges: [
        // Alice → Bob, Charlie, Diana (3 children)
        { id: 'e1', source: 'alice', target: 'bob', type: 'parent-child' },
        { id: 'e2', source: 'alice', target: 'charlie', type: 'parent-child' },
        { id: 'e3', source: 'alice', target: 'diana', type: 'parent-child' },
        // Bob → Eve (grandchild)
        { id: 'e4', source: 'bob', target: 'eve', type: 'parent-child' },
        // Separate family tree: Frank → Grace
        { id: 'e5', source: 'frank', target: 'grace', type: 'parent-child' },
        // Spouse relationships
        { id: 's1', source: 'alice', target: 'henry', type: 'spouse' },
        { id: 's2', source: 'bob', target: 'iris', type: 'spouse' },
      ],
    };
    
    // Build hierarchy from flat data
    const result = buildGenealogyHierarchy(sampleData);
    setHierarchy(result);
  }, []);
  
  if (!hierarchy) {
    return <div>Loading...</div>;
  }
  
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
          Hierarchical Tree Demo
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
          Click nodes to select • Click +/− to expand/collapse • Drag to pan • Scroll to zoom • Orange dashed lines = spouses
        </p>
        {selectedPersonId && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f3f4f6', borderRadius: '0.25rem' }}>
            <strong>Selected:</strong> {hierarchy.nodeMap.get(selectedPersonId)?.displayName || selectedPersonId}
            <button
              onClick={() => setSelectedPersonId(null)}
              style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        <HierarchicalTreeCanvas
          hierarchy={hierarchy}
          orientation="vertical"
          selectedPersonId={selectedPersonId}
          onSelectPerson={setSelectedPersonId}
          layout={{
            nodeSpacingX: 150,
            nodeSpacingY: 120,
            nodeRadius: 10,
            transitionDuration: 300,
            showSpouseEdges: true,
            spouseOffset: 60,
          }}
          theme={{
            nodeFillMale: '#3b82f6',
            nodeFillFemale: '#ec4899',
            nodeFillUnknown: '#6b7280',
            selectedColor: '#0ea5e9',
            edgeColor: '#94a3b8',
          }}
        />
      </div>
    </div>
  );
};
