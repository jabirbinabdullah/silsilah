import React, { useState } from 'react';
import type { PersonDetails } from '../api';

type MergeDialogProps = {
  open: boolean;
  currentPerson: PersonDetails | null;
  duplicatePerson: PersonDetails | null;
  onConfirm: (fieldsToKeep: Record<string, boolean>) => void;
  onCancel: () => void;
  loading?: boolean;
};

export const MergeDialog: React.FC<MergeDialogProps> = ({ open, currentPerson, duplicatePerson, onConfirm, onCancel, loading }) => {
  const [fieldsToKeep, setFieldsToKeep] = useState<Record<string, boolean>>({
    name: true,
    gender: true,
    birthDate: true,
    deathDate: true,
    birthPlace: true,
  });

  if (!open || !currentPerson || !duplicatePerson) return null;

  const toggleField = (field: string) => {
    setFieldsToKeep((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const renderField = (label: string, field: string, currentVal: any, duplicateVal: any) => {
    const isSame = String(currentVal) === String(duplicateVal);
    return (
      <div key={field} className="row mb-3 align-items-center">
        <div className="col-3">
          <strong>{label}</strong>
        </div>
        <div className="col-3">
          <div className={`card ${fieldsToKeep[field] ? 'border-primary' : 'border-secondary'}`} style={{ minHeight: '60px' }} onClick={() => toggleField(field)}>
            <div className="card-body p-2">
              <small className="text-muted">Current</small>
              <div className="fw-semibold">{currentVal || '—'}</div>
              <div className={`form-check mt-1 ${fieldsToKeep[field] ? '' : 'd-none'}`}>
                <input className="form-check-input" type="radio" name={field} id={`${field}_current`} checked={fieldsToKeep[field]} onChange={() => toggleField(field)} disabled />
              </div>
            </div>
          </div>
        </div>
        <div className="col-3">
          <div className={`card ${!fieldsToKeep[field] && !isSame ? 'border-primary' : 'border-secondary'}`} style={{ minHeight: '60px' }} onClick={() => !isSame && toggleField(field)}>
            <div className="card-body p-2">
              <small className="text-muted">Duplicate</small>
              <div className="fw-semibold">{duplicateVal || '—'}</div>
              {!isSame && (
                <div className="form-check mt-1">
                  <input className="form-check-input" type="radio" name={field} id={`${field}_duplicate`} checked={!fieldsToKeep[field]} onChange={() => toggleField(field)} disabled />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-3 text-center">
          {isSame && <span className="badge bg-success">Same</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="modal fade show" style={{ display: 'block' }} aria-modal="true" role="dialog">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Merge Duplicate Persons</h5>
            <button type="button" className="btn-close" onClick={onCancel} disabled={loading} aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <p className="mb-3 text-muted">Select which person's data to keep for each field. Click a card to change selection.</p>
            {renderField('Name', 'name', currentPerson.name, duplicatePerson.name)}
            {renderField('Gender', 'gender', currentPerson.gender, duplicatePerson.gender)}
            {renderField('Birth Date', 'birthDate', currentPerson.birthDate, duplicatePerson.birthDate)}
            {renderField('Death Date', 'deathDate', currentPerson.deathDate, duplicatePerson.deathDate)}
            {renderField('Birth Place', 'birthPlace', currentPerson.birthPlace, duplicatePerson.birthPlace)}
            <div className="alert alert-info mt-4 p-2">
              <strong>Note:</strong> The duplicate person will be merged into the current person, and all relationships will be updated.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => onConfirm(fieldsToKeep)} disabled={loading}>
              {loading ? 'Merging…' : 'Confirm Merge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
