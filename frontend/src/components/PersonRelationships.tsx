import React from 'react';

export type FamilyNode = {
  personId: string;
  displayName: string;
};

type PersonRelationshipsProps = {
  parents: FamilyNode[];
  children: FamilyNode[];
  spouses: FamilyNode[];
  selectedPersonId: string;
  onSelectPerson: (personId: string) => void;
};

type FamilySectionProps = {
  title: string;
  members: FamilyNode[];
  selectedPersonId: string;
  onSelectPerson: (personId: string) => void;
};

const FamilySection: React.FC<FamilySectionProps> = ({ title, members, selectedPersonId, onSelectPerson }) => {
  if (members.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">{title}</h3>
      <ul className="space-y-1">
        {members.map((member: FamilyNode) => (
          <li key={member.personId}>
            <button
              onClick={() => onSelectPerson(member.personId)}
              className={`text-sm w-full text-left px-2 py-1 rounded hover:bg-blue-100 transition-colors ${
                member.personId === selectedPersonId
                  ? 'bg-blue-200 text-blue-900 font-medium'
                  : 'text-blue-600 hover:text-blue-700'
              }`}
            >
              {member.displayName}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const PersonRelationships: React.FC<PersonRelationshipsProps> = ({
  parents,
  children,
  spouses,
  selectedPersonId,
  onSelectPerson,
}: PersonRelationshipsProps) => {
  const hasAnyRelationships = parents.length > 0 || children.length > 0 || spouses.length > 0;

  if (!hasAnyRelationships) {
    return (
      <div className="text-gray-500 text-sm italic">
        No family members visible in tree
      </div>
    );
  }

  return (
    <div>
      <FamilySection
        title="Parents"
        members={parents}
        selectedPersonId={selectedPersonId}
        onSelectPerson={onSelectPerson}
      />
      <FamilySection
        title="Spouses"
        members={spouses}
        selectedPersonId={selectedPersonId}
        onSelectPerson={onSelectPerson}
      />
      <FamilySection
        title="Children"
        members={children}
        selectedPersonId={selectedPersonId}
        onSelectPerson={onSelectPerson}
      />
    </div>
  );
};
