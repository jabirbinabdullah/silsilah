import React from 'react';
import type { RenderEdgeData } from '../api';

type RelationshipEditDrawerProps = {
  open: boolean;
  edge: RenderEdgeData | null;
  onClose: () => void;
  onDelete?: (edge: RenderEdgeData) => Promise<void> | void;
};

import { withErrorBoundary } from '../utils/withErrorBoundary';

const RelationshipEditDrawerInner: React.FC<RelationshipEditDrawerProps> = ({ open, edge, onClose, onDelete }) => {
  const canDelete = !!onDelete && !!edge;
  return (
    <>
      <div
        className={`offcanvas offcanvas-end ${open ? 'show' : ''}`}
        tabIndex={-1}
        id="relationshipEditOffcanvas"
        aria-labelledby="relationshipEditOffcanvasLabel"
        style={{ visibility: open ? 'visible' : 'hidden', maxWidth: '420px', width: '100%' }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title" id="relationshipEditOffcanvasLabel">Edit Relationship</h5>
          <button type="button" className="btn-close text-reset" onClick={onClose} aria-label="Close"></button>
        </div>
        <div className="offcanvas-body">
          {edge ? (
            <div>
              <div className="mb-3">
                <span className="badge bg-secondary me-2">{edge.type}</span>
                <span className="text-muted">ID: {edge.id}</span>
              </div>
              <ul className="list-group">
                <li className="list-group-item">Source: {edge.source}</li>
                <li className="list-group-item">Target: {edge.target}</li>
              </ul>
              <div className="mt-3 d-flex justify-content-end gap-2">
                <button className="btn btn-secondary" onClick={onClose}>Close</button>
                <button className="btn btn-danger" disabled={!canDelete} onClick={async () => { if (onDelete && edge) await onDelete(edge); }}>
                  Delete Relationship
                </button>
              </div>
            </div>
          ) : (
            <div className="text-muted">No relationship selected.</div>
          )}
        </div>
      </div>
      {open && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}
    </>
  );
};

export const RelationshipEditDrawer = withErrorBoundary(RelationshipEditDrawerInner);
