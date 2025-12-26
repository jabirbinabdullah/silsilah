/**
 * Command to import persons from CSV into a family tree.
 * CSV format (header required):
 * 
 * personId,name,gender,birthDate,birthPlace,deathDate
 * p1,Alice Smith,FEMALE,1990-01-15,New York,,
 * p2,Bob Smith,MALE,1988-06-20,Boston,2020-12-01,
 * 
 * Rules:
 * - personId must be unique and non-empty
 * - name must be non-empty
 * - gender must be MALE, FEMALE, or UNKNOWN
 * - dates must be valid ISO 8601 (YYYY-MM-DD) or empty
 * - Entire import fails if ANY row is invalid (all-or-nothing)
 * - Existing persons with same personId are SKIPPED (idempotent)
 */
export interface ImportPersonsCommand {
  treeId: string;
  csvContent: string; // Raw CSV string with header
}

/**
 * Parsed row from CSV
 */
export interface CsvPersonRow {
  personId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate: Date | null;
  birthPlace: string | null;
  deathDate: Date | null;
}

/**
 * Import result with counts and errors
 */
export interface ImportPersonsResult {
  imported: number;
  skipped: number;
  total: number;
  errors: Array<{
    row: number;
    personId?: string;
    message: string;
  }>;
}
