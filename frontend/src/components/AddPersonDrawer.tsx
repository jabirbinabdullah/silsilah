import React, { useState, useEffect } from 'react';
import { GenealogyCommandBus } from '../commands/genealogyCommands';
import type { CreatePersonPayload } from '../api';

type AddPersonDrawerProps = {
  treeId: string;
  open: boolean;
  onClose: () => void;
  onCreated: (personId: string) => void;
};

const genders: Array<{ value: CreatePersonPayload['gender']; label: string }> = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

import { withErrorBoundary } from '../utils/withErrorBoundary';
import { PersonForm } from './PersonForm';

const AddPersonDrawerInner: React.FC<AddPersonDrawerProps> = ({
  treeId,
  open,
  onClose,
  onCreated,
}) => {
  const [form, setForm] = useState<CreatePersonPayload>({
    personId: '',
    name: '',
    gender: 'UNKNOWN',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CreatePersonPayload, string>>>({});

  useEffect(() => {
    // Reset form when drawer is closed
    if (!open) {
      resetForm();
    }
  }, [open]);

  const updateField = (key: keyof CreatePersonPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    const err = validateField(key, value);
    setFieldErrors((prev) => ({
      ...prev,
      [key]: err || undefined,
    }));
  };

  const validateField = (key: keyof CreatePersonPayload, val: string): string | null => {
    if (key === 'personId') {
      if (!val || val.trim() === '') return 'Person ID is required';
      if (!/^[a-zA-Z0-9_-]+$/.test(val)) return 'Invalid format (letters, numbers, dash, underscore)';
    }
    if (key === 'name') {
      if (!val || val.trim() === '') return 'Name is required';
    }
    if (key === 'gender') {
      if (!val) return 'Gender is required';
    }
    if (key === 'birthDate' && val && form.deathDate) {
      const b = new Date(val);
      const d = new Date(form.deathDate);
      if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) return null;
      if (d < b) return 'Death date must be after birth date';
    }
    if (key === 'deathDate' && val && form.birthDate) {
      const b = new Date(form.birthDate);
      const d = new Date(val);
      if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) return null;
      if (d < b) return 'Death date must be after birth date';
    }
    return null;
  };

  const resetForm = () => {
    setForm({
      personId: '',
      name: '',
      gender: 'UNKNOWN',
      birthDate: '',
      birthPlace: '',
      deathDate: '',
    });
    setError(null);
    setFieldErrors({});
  };

  const validate = (): string | null => {
    if (!form.personId || form.personId.trim() === '') return 'Person ID is required';
    if (!/^[a-zA-Z0-9_-]+$/.test(form.personId)) {
      return 'Person ID must contain only letters, numbers, dashes, or underscores';
    }
    if (!form.name || form.name.trim() === '') return 'Name is required';
    if (!form.gender) return 'Gender is required';
    if (form.birthDate && form.deathDate) {
      const b = new Date(form.birthDate);
      const d = new Date(form.deathDate);
      if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) {
        return 'Invalid date format';
      }
      if (d < b) return 'Death date must be after or equal to birth date';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: CreatePersonPayload = {
        personId: form.personId.trim(),
        name: form.name.trim(),
        gender: form.gender,
        birthDate: form.birthDate || null,
        birthPlace: form.birthPlace || null,
        deathDate: form.deathDate || null,
      };
      // Use command bus instead of direct API call
      const result = await GenealogyCommandBus.addPerson({
        treeId,
        name: payload.name,
        gender: payload.gender,
        birthDate: payload.birthDate,
        birthPlace: payload.birthPlace,
        deathDate: payload.deathDate,
      });
      
      if (result.success && result.data) {
        onCreated(result.data.personId);
        onClose(); // This will trigger the parent to set open=false
      } else {
        setError(result.error || 'Failed to add person');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to add person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={`offcanvas offcanvas-end ${open ? 'show' : ''}`}
        tabIndex={-1}
        id="addPersonOffcanvas"
        aria-labelledby="addPersonOffcanvasLabel"
        style={{ visibility: open ? 'visible' : 'hidden', maxWidth: '480px', width: '100%' }}
      >
        <div className="offcanvas-header border-bottom">
          <h5 className="offcanvas-title" id="addPersonOffcanvasLabel">
            Add New Person
          </h5>
          <button
            type="button"
            className="btn-close text-reset"
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>
        <div className="offcanvas-body d-flex flex-column">
          <form
            className="flex-grow-1 d-flex flex-column"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="flex-grow-1 overflow-y-auto p-3">
              {error && <div className="alert alert-danger">{error}</div>}
              <PersonForm value={form} onChange={setForm} disabled={saving} showPersonId errors={fieldErrors} />
            </div>

            <div className="p-3 bg-light border-top d-flex justify-content-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create Person'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {open && <div className="offcanvas-backdrop fade show" onClick={onClose}></div>}
    </>
  );
};

export const AddPersonDrawer = withErrorBoundary(AddPersonDrawerInner);
