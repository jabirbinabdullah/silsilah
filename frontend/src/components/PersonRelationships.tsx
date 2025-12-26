import React from 'react';

export type FamilyNode = {
  personId: string;
  displayName: string;
};

type PersonRelationshipsProps = {
  parents: FamilyNode[];
  children: FamilyNode[];
  spouses: FamilyNode[];
  onSelectPerson: (personId: string) => void;
};

type FamilySectionProps = {
  title: string;
  members: FamilyNode[];
  icon: React.ReactNode;
  onSelectPerson: (personId: string) => void;
};

const RelationshipSection: React.FC<FamilySectionProps> = ({ title, members, icon, onSelectPerson }) => {
  if (members.length === 0) return null;

  return (
    <div className="mb-3">
      <h6 className="text-muted small d-flex align-items-center gap-2">
        {icon}
        {title}
      </h6>
      <div className="list-group list-group-flush">
        {members.map((member) => (
          <button
            key={member.personId}
            type="button"
            onClick={() => onSelectPerson(member.personId)}
            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
          >
            {member.displayName}
            <span className="text-muted">›</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const iconProps = {
  width: '16',
  height: '16',
  className: 'text-secondary',
};

const SpousesIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4.7 19.3A8.5 8.5 0 0 1 12 4.8a8.5 8.5 0 0 1 7.3 14.5" />
    <path d="M8 14A4 4 0 1 0 8 6a4 4 0 0 0 0 8Z" />
    <path d="M16 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
  </svg>
);

const ParentsIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M6 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="m6 13 2-4" />
    <path d="m18 13-2-4" />
  </svg>
);

const ChildrenIcon = () => (
  <svg {...iconProps} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M12 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
    <path d="M12 14v-4" />
  </svg>
);

export const PersonRelationships: React.FC<PersonRelationshipsProps> = ({
  parents,
  children,
  spouses,
  onSelectPerson,
}) => {
  const hasAnyRelationships = parents.length > 0 || children.length > 0 || spouses.length > 0;

  if (!hasAnyRelationships) {
    return <div className="text-muted text-center p-3 fst-italic">No direct family listed.</div>;
  }

  return (
    <div>
      <RelationshipSection
        title="Parents"
        members={parents}
        icon={<ParentsIcon />}
        onSelectPerson={onSelectPerson}
      />
      <RelationshipSection
        title="Spouses"
        members={spouses}
        icon={<SpousesIcon />}
        onSelectPerson={onSelectPerson}
      />
      <RelationshipSection
        title="Children"
        members={children}
        icon={<ChildrenIcon />}
        onSelectPerson={onSelectPerson}
      />
    </div>
  );
};
