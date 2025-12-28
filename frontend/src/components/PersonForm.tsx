import React from 'react';
import type { CreatePersonPayload } from '../api';

export type PersonFormProps = {
  value: CreatePersonPayload;
  onChange: (next: CreatePersonPayload) => void;
  disabled?: boolean;
  showPersonId?: boolean;
  readonlyPersonId?: boolean;
  errors?: Partial<Record<keyof CreatePersonPayload, string>>;
};

export function validatePersonForm(value: CreatePersonPayload): string | null {
  if (!value.personId || value.personId.trim() === '') return 'Person ID is required';
  if (!/^[a-zA-Z0-9_-]+$/.test(value.personId)) {
    return 'Person ID must contain only letters, numbers, dashes, or underscores';
  }
  if (!value.name || value.name.trim() === '') return 'Name is required';
  if (!value.gender) return 'Gender is required';
  if (value.birthDate && value.deathDate) {
    const b = new Date(value.birthDate);
    const d = new Date(value.deathDate);
    if (Number.isNaN(b.getTime()) || Number.isNaN(d.getTime())) {
      return 'Invalid date format';
    }
    if (d < b) return 'Death date must be after or equal to birth date';
  }
  return null;
}

export const PersonForm: React.FC<PersonFormProps> = ({ value, onChange, disabled, showPersonId = true, readonlyPersonId = false, errors = {} }) => {
  const update = (key: keyof CreatePersonPayload, val: any) => {
    onChange({ ...value, [key]: val });
  };

  const getClassName = (field: keyof CreatePersonPayload) => {
    return `form-control ${errors[field] ? 'is-invalid' : ''}`;
  };

  return (
    <div>
      {showPersonId && (
        <div className="mb-3">
          <label htmlFor="pf_personId" className="form-label">
            Person ID <span className="text-danger">*</span>
          </label>
          <input
            id="pf_personId"
            className={getClassName('personId')}
            value={value.personId}
            onChange={(e) => update('personId', e.target.value)}
            disabled={disabled || readonlyPersonId}
            placeholder="e.g., john-smith-1972"
          />
          <div className="form-text">Use letters, numbers, dash, or underscore only.</div>
          {errors.personId && <div className="invalid-feedback d-block">{errors.personId}</div>}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor="pf_name" className="form-label">
          Full Name <span className="text-danger">*</span>
        </label>
        <input
          id="pf_name"
          className={getClassName('name')}
          value={value.name}
          onChange={(e) => update('name', e.target.value)}
          disabled={disabled}
          placeholder="e.g., John Michael Smith"
        />
        {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
      </div>

      <div className="mb-3">
        <label htmlFor="pf_gender" className="form-label">
          Gender <span className="text-danger">*</span>
        </label>
        <select
          id="pf_gender"
          className={getClassName('gender')}
          value={value.gender}
          onChange={(e) => update('gender', e.target.value as CreatePersonPayload['gender'])}
          disabled={disabled}
        >
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="UNKNOWN">Unknown</option>
        </select>
        {errors.gender && <div className="invalid-feedback d-block">{errors.gender}</div>}
      </div>

      <hr className="my-4" />
      <h6 className="text-muted">Additional Details (Optional)</h6>

      <div className="row g-3">
        <div className="col">
          <label htmlFor="pf_birthDate" className="form-label">
            Birth Date
          </label>
          <input
            type="date"
            id="pf_birthDate"
            className={getClassName('birthDate')}
            value={value.birthDate || ''}
            onChange={(e) => update('birthDate', e.target.value)}
            disabled={disabled}
          />
          {errors.birthDate && <div className="invalid-feedback d-block">{errors.birthDate}</div>}
        </div>
        <div className="col">
          <label htmlFor="pf_deathDate" className="form-label">
            Death Date
          </label>
          <input
            type="date"
            id="pf_deathDate"
            className={getClassName('deathDate')}
            value={value.deathDate || ''}
            onChange={(e) => update('deathDate', e.target.value)}
            disabled={disabled}
          />
          {errors.deathDate && <div className="invalid-feedback d-block">{errors.deathDate}</div>}
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="pf_birthPlace" className="form-label">
          Birth Place
        </label>
        <input
          id="pf_birthPlace"
          className={getClassName('birthPlace')}
          value={value.birthPlace || ''}
          onChange={(e) => update('birthPlace', e.target.value)}
          disabled={disabled}
          placeholder="e.g., Boston, Massachusetts, USA"
        />
        {errors.birthPlace && <div className="invalid-feedback d-block">{errors.birthPlace}</div>}
      </div>
    </div>
  );
};
