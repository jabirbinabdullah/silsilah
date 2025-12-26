import React, { useState, useEffect } from 'react';
import { createPerson, CreatePersonPayload } from '../api';

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

export const AddPersonDrawer: React.FC<AddPersonDrawerProps> = ({
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

  useEffect(() => {
    // Reset form when drawer is closed
    if (!open) {
      resetForm();
    }
  }, [open]);

  const updateField = (key: keyof CreatePersonPayload, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      const res = await createPerson(treeId, payload);
      onCreated(res.personId);
      onClose(); // This will trigger the parent to set open=false
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

              <div className="mb-3">
                <label htmlFor="personId" className="form-label">
                  Person ID <span className="text-danger">*</span>
                </label>
                <input
                  id="personId"
                  className="form-control"
                  value={form.personId}
                  onChange={(e) => updateField('personId', e.target.value)}
                  placeholder="e.g., john-smith-1972"
                  autoFocus
                />
                <div className="form-text">
                  Use letters, numbers, dash, or underscore only.
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="name"
                  className="form-control"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., John Michael Smith"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="gender" className="form-label">
                  Gender <span className="text-danger">*</span>
                </label>
                <select
                  id="gender"
                  className="form-select"
                  value={form.gender}
                  onChange={(e) =>
                    updateField('gender', e.target.value as CreatePersonPayload['gender'])
                  }
                >
                  {genders.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <hr className="my-4" />
              <h6 className="text-muted">Additional Details (Optional)</h6>

              <div className="row g-3">
                <div className="col">
                  <label htmlFor="birthDate" className="form-label">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    id="birthDate"
                    className="form-control"
                    value={form.birthDate || ''}
                    onChange={(e) => updateField('birthDate', e.target.value)}
                  />
                </div>
                <div className="col">
                  <label htmlFor="deathDate" className="form-label">
                    Death Date
                  </label>
                  <input
                    type="date"
                    id="deathDate"
                    className="form-control"
                    value={form.deathDate || ''}
                    onChange={(e) => updateField('deathDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label htmlFor="birthPlace" className="form-label">
                  Birth Place
                </label>
                <input
                  id="birthPlace"
                  className="form-control"
                  value={form.birthPlace || ''}
                  onChange={(e) => updateField('birthPlace', e.target.value)}
                  placeholder="e.g., Boston, Massachusetts, USA"
                />
              </div>
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
