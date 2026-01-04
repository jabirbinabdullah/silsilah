import React, { useState, useRef, useEffect } from 'react';
import type { TreeListItem } from '../api';

interface TreeCardMenuProps {
  tree: TreeListItem;
  onRename: () => void;
  onChangeDescription: () => void;
  onExport: (format: 'json-full' | 'json-minimal' | 'gedcom') => void;
  onDelete: () => void;
  onImport?: () => void;
}

const TreeCardMenu: React.FC<TreeCardMenuProps> = ({
  tree,
  onRename,
  onChangeDescription,
  onExport,
  onDelete,
  onImport,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const isOwner = tree.role === 'OWNER';

  const handleMenuClick = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition"
        title="Tree options"
        aria-label="Tree menu"
      >
        ⋮
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Rename */}
          <button
            onClick={() => handleMenuClick(onRename)}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition first:rounded-t-lg"
            disabled={!isOwner}
            title={!isOwner ? 'Only owners can rename' : ''}
          >
            ✏️ Rename Tree
          </button>

          {/* Change Description */}
          <button
            onClick={() => handleMenuClick(onChangeDescription)}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition border-t border-gray-200"
            disabled={!isOwner}
            title={!isOwner ? 'Only owners can edit' : ''}
          >
            📝 Change Description
          </button>

          <div className="border-t border-gray-200 my-1" />

          {/* Export */}
          <div className="px-4 py-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Export</p>
            <button
              onClick={() => handleMenuClick(() => onExport('json-full'))}
              className="block w-full text-left text-xs text-gray-700 hover:text-gray-900 py-1 hover:bg-gray-100 rounded px-2 transition"
            >
              📦 JSON (Full)
            </button>
            <button
              onClick={() => handleMenuClick(() => onExport('json-minimal'))}
              className="block w-full text-left text-xs text-gray-700 hover:text-gray-900 py-1 hover:bg-gray-100 rounded px-2 transition"
            >
              📄 JSON (Minimal)
            </button>
            <button
              onClick={() => handleMenuClick(() => onExport('gedcom'))}
              className="block w-full text-left text-xs text-gray-700 hover:text-gray-900 py-1 hover:bg-gray-100 rounded px-2 transition"
            >
              🧬 GEDCOM Format
            </button>
          </div>

          <div className="border-t border-gray-200 my-1" />

          {/* Import */}
          {onImport && (
            <>
              <button
                onClick={() => handleMenuClick(onImport)}
                className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition border-t border-gray-200"
              >
                ⬆️ Import Data
              </button>

              <div className="border-t border-gray-200 my-1" />
            </>
          )}

          {/* Delete */}
          <button
            onClick={() => handleMenuClick(onDelete)}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition last:rounded-b-lg border-t border-gray-200"
            disabled={!isOwner}
            title={!isOwner ? 'Only owners can delete' : ''}
          >
            🗑️ Delete Tree
          </button>
        </div>
      )}
    </div>
  );
};

export default TreeCardMenu;
