import React, { useState } from 'react';
import type { CreatePersonPayload } from '../api';

export type QuickPersonFormProps = {
  onSubmit: (payload: CreatePersonPayload) => Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export const QuickPersonForm: React.FC<QuickPersonFormProps> = ({ onSubmit, loading = false, error }) => {
  const [personId, setPersonId] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'UNKNOWN'>('UNKNOWN');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      personId: personId.trim(),
      name: name.trim(),
      gender,
      birthDate: birthDate || null,
      birthPlace: null,
      deathDate: deathDate || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="d-flex flex-column gap-2">
      {error && <div className="alert alert-danger">{error}</div>}
      <input className="form-control" value={personId} onChange={e => setPersonId(e.target.value)} placeholder="Person ID" required />
      <input className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" required />
      <select className="form-select" value={gender} onChange={e => setGender(e.target.value as any)}>
        <option value="MALE">Male</option>
        <option value="FEMALE">Female</option>
        <option value="UNKNOWN">Unknown</option>
      </select>
      <input type="date" className="form-control" value={birthDate} onChange={e => setBirthDate(e.target.value)} placeholder="Birth Date" />
      <input type="date" className="form-control" value={deathDate} onChange={e => setDeathDate(e.target.value)} placeholder="Death Date" />
      <button type="submit" className="btn btn-success" disabled={loading}>{loading ? 'Creating…' : 'Create and Link'}</button>
    </form>
  );
};
