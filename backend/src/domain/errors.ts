export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InvariantViolationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantViolationError';
  }
}

export class DuplicateRelationshipError extends InvariantViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateRelationshipError';
  }
}

export class ParentLimitExceededError extends InvariantViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'ParentLimitExceededError';
  }
}

export class CycleDetectedError extends InvariantViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'CycleDetectedError';
  }
}

export class AgeInconsistencyError extends InvariantViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'AgeInconsistencyError';
  }
}

export class InvalidRelationshipShapeError extends InvariantViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRelationshipShapeError';
  }
}

export class PersonHasRelationshipsError extends InvariantViolationError {
  constructor(message: string) {
    super(message);
    this.name = 'PersonHasRelationshipsError';
  }
}

export class AuthorizationError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class OwnershipError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'OwnershipError';
  }
}

export class MembershipError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = 'MembershipError';
  }
}
