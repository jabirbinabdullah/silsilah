import { TreeRenderV1, RenderNode } from '../api';

export interface PersonStats {
  id: string;
  displayName: string;
  birthDate?: string | null;
  deathDate?: string | null;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
}

export interface BasicStats {
  totalPeople: number;
  totalGenerations: number;
  oldestPerson?: {
    name: string;
    id: string;
    age?: number;
  };
  youngestPerson?: {
    name: string;
    id: string;
    age?: number;
  };
  averageAge?: number;
}

export interface RelationshipStats {
  spouseRelationships: number;
  parentChildRelationships: number;
  totalRelationships: number;
}

export interface GenderStats {
  male: number;
  female: number;
  unknown: number;
}

export interface LifespanStats {
  peopleWithBirthDate: number;
  peopleWithDeathDate: number;
  averageLifespan?: number;
  averageBirthYear?: number;
  averageDeathYear?: number;
  birthYearRange?: {
    min: number;
    max: number;
  };
  deathYearRange?: {
    min: number;
    max: number;
  };
}

export interface FamilyEvent {
  year: number;
  type: 'birth' | 'death' | 'marriage';
  count: number;
  description?: string;
}

export interface TreeStatistics {
  basicStats: BasicStats;
  relationshipStats: RelationshipStats;
  genderStats: GenderStats;
  lifespanStats: LifespanStats;
  timelineEvents: FamilyEvent[];
  calculatedAt: Date;
}

/**
 * Calculate basic statistics about the tree
 */
export function calculateBasicStats(data: TreeRenderV1, personStats: Map<string, PersonStats>): BasicStats {
  const totalPeople = data.nodes.length;

  // Calculate generations
  const generations = calculateGenerations(data, personStats);
  const totalGenerations = generations.size;

  // Find oldest and youngest people
  const peopleWithDates = Array.from(personStats.values()).filter(
    p => p.birthDate || p.deathDate
  );

  let oldestPerson: BasicStats['oldestPerson'];
  let youngestPerson: BasicStats['youngestPerson'];
  let averageAge = 0;

  if (peopleWithDates.length > 0) {
    // Calculate ages
    const peopleWithAges = peopleWithDates
      .map(person => ({
        ...person,
        age: calculateAge(person.birthDate, person.deathDate),
      }))
      .filter(p => p.age !== undefined);

    if (peopleWithAges.length > 0) {
      // Find oldest (highest age or earliest birth)
      const oldest = peopleWithAges.reduce((prev, current) => {
        const prevAge = prev.age || 0;
        const currAge = current.age || 0;
        return currAge > prevAge ? current : prev;
      });
      oldestPerson = {
        name: oldest.displayName,
        id: oldest.id,
        age: oldest.age,
      };

      // Find youngest (lowest age or latest birth)
      const youngest = peopleWithAges.reduce((prev, current) => {
        const prevAge = prev.age || 0;
        const currAge = current.age || 0;
        return currAge < prevAge ? current : prev;
      });
      youngestPerson = {
        name: youngest.displayName,
        id: youngest.id,
        age: youngest.age,
      };

      // Calculate average age
      const totalAge = peopleWithAges.reduce((sum, p) => sum + (p.age || 0), 0);
      averageAge = Math.round(totalAge / peopleWithAges.length);
    }
  }

  return {
    totalPeople,
    totalGenerations,
    oldestPerson,
    youngestPerson,
    averageAge: averageAge > 0 ? averageAge : undefined,
  };
}

/**
 * Calculate relationship statistics
 */
export function calculateRelationshipStats(data: TreeRenderV1): RelationshipStats {
  const spouseRelationships = data.edges.filter(e => e.type === 'spouse').length;
  const parentChildRelationships = data.edges.filter(e => e.type === 'parent-child').length;
  const totalRelationships = data.edges.length;

  return {
    spouseRelationships,
    parentChildRelationships,
    totalRelationships,
  };
}

/**
 * Calculate gender distribution
 */
export function calculateGenderStats(personStats: Map<string, PersonStats>): GenderStats {
  const stats = {
    male: 0,
    female: 0,
    unknown: 0,
  };

  personStats.forEach(person => {
    const gender = person.gender?.toUpperCase() || 'UNKNOWN';
    if (gender === 'MALE') stats.male++;
    else if (gender === 'FEMALE') stats.female++;
    else stats.unknown++;
  });

  return stats;
}

/**
 * Calculate lifespan statistics
 */
export function calculateLifespanStats(personStats: Map<string, PersonStats>): LifespanStats {
  const peopleWithBirthDate = Array.from(personStats.values()).filter(p => p.birthDate).length;
  const peopleWithDeathDate = Array.from(personStats.values()).filter(p => p.deathDate).length;

  let averageLifespan: number | undefined;
  let averageBirthYear: number | undefined;
  let averageDeathYear: number | undefined;
  let birthYearRange: LifespanStats['birthYearRange'];
  let deathYearRange: LifespanStats['deathYearRange'];

  const birthYears: number[] = [];
  const deathYears: number[] = [];
  const lifespans: number[] = [];

  personStats.forEach(person => {
    if (person.birthDate) {
      const year = new Date(person.birthDate).getFullYear();
      if (!isNaN(year)) birthYears.push(year);
    }
    if (person.deathDate) {
      const year = new Date(person.deathDate).getFullYear();
      if (!isNaN(year)) deathYears.push(year);
    }
    const lifespan = calculateAge(person.birthDate, person.deathDate);
    if (lifespan) lifespans.push(lifespan);
  });

  if (birthYears.length > 0) {
    averageBirthYear = Math.round(birthYears.reduce((a, b) => a + b, 0) / birthYears.length);
    birthYearRange = {
      min: Math.min(...birthYears),
      max: Math.max(...birthYears),
    };
  }

  if (deathYears.length > 0) {
    averageDeathYear = Math.round(deathYears.reduce((a, b) => a + b, 0) / deathYears.length);
    deathYearRange = {
      min: Math.min(...deathYears),
      max: Math.max(...deathYears),
    };
  }

  if (lifespans.length > 0) {
    averageLifespan = Math.round(lifespans.reduce((a, b) => a + b, 0) / lifespans.length);
  }

  return {
    peopleWithBirthDate,
    peopleWithDeathDate,
    averageLifespan,
    averageBirthYear,
    averageDeathYear,
    birthYearRange,
    deathYearRange,
  };
}

/**
 * Generate timeline of family events
 */
export function generateTimelineEvents(personStats: Map<string, PersonStats>): FamilyEvent[] {
  const eventsByYear: Map<number, { births: number; deaths: number }> = new Map();

  personStats.forEach(person => {
    if (person.birthDate) {
      const year = new Date(person.birthDate).getFullYear();
      if (!isNaN(year)) {
        const entry = eventsByYear.get(year) || { births: 0, deaths: 0 };
        entry.births++;
        eventsByYear.set(year, entry);
      }
    }

    if (person.deathDate) {
      const year = new Date(person.deathDate).getFullYear();
      if (!isNaN(year)) {
        const entry = eventsByYear.get(year) || { births: 0, deaths: 0 };
        entry.deaths++;
        eventsByYear.set(year, entry);
      }
    }
  });

  const events: FamilyEvent[] = [];

  eventsByYear.forEach((counts, year) => {
    if (counts.births > 0) {
      events.push({
        year,
        type: 'birth',
        count: counts.births,
        description: `${counts.births} birth${counts.births > 1 ? 's' : ''}`,
      });
    }
    if (counts.deaths > 0) {
      events.push({
        year,
        type: 'death',
        count: counts.deaths,
        description: `${counts.deaths} death${counts.deaths > 1 ? 's' : ''}`,
      });
    }
  });

  // Sort by year
  events.sort((a, b) => a.year - b.year);

  return events;
}

/**
 * Calculate number of generations in the tree
 */
function calculateGenerations(data: TreeRenderV1, personStats: Map<string, PersonStats>): Set<number> {
  const generationMap = new Map<string, number>();

  // Find roots (people with no parents)
  const hasParent = new Set<string>();
  data.edges.forEach(edge => {
    if (edge.type === 'parent-child') {
      const childId = edge.target;
      hasParent.add(childId);
    }
  });

  // Initialize roots at generation 0
  data.nodes.forEach(node => {
    if (!hasParent.has(node.id)) {
      generationMap.set(node.id, 0);
    }
  });

  // Use BFS to assign generations
  const queue: string[] = Array.from(generationMap.keys());
  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) continue;

    const currentGen = generationMap.get(currentId) || 0;

    // Find children and assign generation
    data.edges.forEach(edge => {
      if (edge.type === 'parent-child' && edge.source === currentId) {
        const childId = edge.target;
        if (!generationMap.has(childId)) {
          generationMap.set(childId, currentGen + 1);
          queue.push(childId);
        }
      }
    });
  }

  return new Set(generationMap.values());
}

/**
 * Calculate age in years
 */
function calculateAge(birthDate?: string | null, deathDate?: string | null): number | undefined {
  if (!birthDate) return undefined;

  const birth = new Date(birthDate);
  const death = deathDate ? new Date(deathDate) : new Date();

  if (isNaN(birth.getTime())) return undefined;

  let age = death.getFullYear() - birth.getFullYear();
  const monthDiff = death.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 ? age : undefined;
}

/**
 * Calculate all statistics for the tree
 */
export function calculateTreeStatistics(data: TreeRenderV1, personStatsMap: Map<string, PersonStats>): TreeStatistics {
  return {
    basicStats: calculateBasicStats(data, personStatsMap),
    relationshipStats: calculateRelationshipStats(data),
    genderStats: calculateGenderStats(personStatsMap),
    lifespanStats: calculateLifespanStats(personStatsMap),
    timelineEvents: generateTimelineEvents(personStatsMap),
    calculatedAt: new Date(),
  };
}

/**
 * Export statistics as CSV
 */
export function exportStatisticsAsCSV(stats: TreeStatistics, treeName: string): string {
  const lines: string[] = [];

  lines.push('Genealogical Tree Statistics Report');
  lines.push(`Tree: ${treeName}`);
  lines.push(`Generated: ${stats.calculatedAt.toLocaleString()}`);
  lines.push('');

  // Basic Statistics
  lines.push('=== BASIC STATISTICS ===');
  lines.push(`Total People,${stats.basicStats.totalPeople}`);
  lines.push(`Total Generations,${stats.basicStats.totalGenerations}`);
  if (stats.basicStats.oldestPerson) {
    lines.push(`Oldest Person,"${stats.basicStats.oldestPerson.name}",Age: ${stats.basicStats.oldestPerson.age || 'N/A'}`);
  }
  if (stats.basicStats.youngestPerson) {
    lines.push(`Youngest Person,"${stats.basicStats.youngestPerson.name}",Age: ${stats.basicStats.youngestPerson.age || 'N/A'}`);
  }
  if (stats.basicStats.averageAge) {
    lines.push(`Average Age,${stats.basicStats.averageAge}`);
  }
  lines.push('');

  // Relationship Statistics
  lines.push('=== RELATIONSHIP STATISTICS ===');
  lines.push(`Spouse Relationships,${stats.relationshipStats.spouseRelationships}`);
  lines.push(`Parent-Child Relationships,${stats.relationshipStats.parentChildRelationships}`);
  lines.push(`Total Relationships,${stats.relationshipStats.totalRelationships}`);
  lines.push('');

  // Gender Distribution
  lines.push('=== GENDER DISTRIBUTION ===');
  lines.push(`Male,${stats.genderStats.male}`);
  lines.push(`Female,${stats.genderStats.female}`);
  lines.push(`Unknown,${stats.genderStats.unknown}`);
  lines.push('');

  // Lifespan Statistics
  lines.push('=== LIFESPAN STATISTICS ===');
  lines.push(`People with Birth Date,${stats.lifespanStats.peopleWithBirthDate}`);
  lines.push(`People with Death Date,${stats.lifespanStats.peopleWithDeathDate}`);
  if (stats.lifespanStats.averageLifespan) {
    lines.push(`Average Lifespan (years),${stats.lifespanStats.averageLifespan}`);
  }
  if (stats.lifespanStats.averageBirthYear) {
    lines.push(`Average Birth Year,${stats.lifespanStats.averageBirthYear}`);
  }
  if (stats.lifespanStats.averageDeathYear) {
    lines.push(`Average Death Year,${stats.lifespanStats.averageDeathYear}`);
  }
  if (stats.lifespanStats.birthYearRange) {
    lines.push(
      `Birth Year Range,${stats.lifespanStats.birthYearRange.min} - ${stats.lifespanStats.birthYearRange.max}`
    );
  }
  if (stats.lifespanStats.deathYearRange) {
    lines.push(
      `Death Year Range,${stats.lifespanStats.deathYearRange.min} - ${stats.lifespanStats.deathYearRange.max}`
    );
  }
  lines.push('');

  // Timeline Events (if any)
  if (stats.timelineEvents.length > 0) {
    lines.push('=== TIMELINE EVENTS ===');
    lines.push('Year,Type,Count');
    stats.timelineEvents.forEach(event => {
      lines.push(`${event.year},${event.type},${event.count}`);
    });
  }

  return lines.join('\n');
}

/**
 * Create a download link for CSV export
 */
export function downloadStatisticsCSV(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
