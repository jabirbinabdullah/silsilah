import { InvariantViolationError } from './errors';

export type Gender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export interface PersonProps {
  personId: string;
  name: string;
  gender: Gender;
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
}

export class Person {
  readonly personId: string;
  readonly name: string;
  readonly gender: Gender;
  readonly birthDate?: Date | null;
  readonly birthPlace?: string | null;
  readonly deathDate?: Date | null;

  constructor(props: PersonProps) {
    this.validate(props);
    this.personId = props.personId;
    this.name = props.name.trim();
    this.gender = props.gender;
    this.birthDate = props.birthDate ?? null;
    this.birthPlace = props.birthPlace ?? null;
    this.deathDate = props.deathDate ?? null;
  }

  private validate(props: PersonProps) {
    if (!props.personId || props.personId.trim() === '') {
      throw new InvariantViolationError('personId is required');
    }
    if (!props.name || props.name.trim() === '' || props.name.length > 255) {
      throw new InvariantViolationError('name must be 1-255 chars');
    }
    if (!['MALE', 'FEMALE', 'UNKNOWN'].includes(props.gender)) {
      throw new InvariantViolationError('gender is invalid');
    }
    if (props.birthDate && props.deathDate && props.deathDate < props.birthDate) {
      throw new InvariantViolationError('deathDate must be after or equal to birthDate');
    }
  }

  withUpdates(updates: Partial<PersonProps>): Person {
    return new Person({
      personId: this.personId,
      name: updates.name ?? this.name,
      gender: updates.gender ?? this.gender,
      birthDate: updates.birthDate ?? this.birthDate,
      birthPlace: updates.birthPlace ?? this.birthPlace,
      deathDate: updates.deathDate ?? this.deathDate,
    });
  }
}
