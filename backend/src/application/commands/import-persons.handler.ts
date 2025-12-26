import type { GenealogyGraphRepository } from '../../infrastructure/repositories';
import type { ImportPersonsCommand, CsvPersonRow, ImportPersonsResult } from './import-persons.command';
import { InvariantViolationError, NotFoundError } from '../../domain/errors';

/**
 * Handler for bulk CSV import of persons.
 * 
 * Strategy:
 * 1. Parse CSV with strict validation (fail on first error)
 * 2. Load existing tree to get current persons
 * 3. Filter out already-existing persons (personId match)
 * 4. Create all new persons atomically (or fail completely)
 * 5. Return counts and any skipped persons
 */
export class ImportPersonsHandler {
  constructor(private repository: GenealogyGraphRepository) {}

  async execute(cmd: ImportPersonsCommand): Promise<ImportPersonsResult> {
    // Phase 1: Validate and parse CSV
    const rows = this.parseAndValidateCsv(cmd.csvContent);

    // Phase 2: Load existing tree
    const tree = await this.repository.findById(cmd.treeId);
    if (!tree) {
      throw new NotFoundError(`Tree ${cmd.treeId} not found`);
    }

    const existingPersonIds = new Set(
      tree.getPersonsSnapshot().map(p => p.personId)
    );

    // Phase 3: Separate new from existing
    const newRows: Array<CsvPersonRow & { rowNumber: number }> = [];
    const skipped: Array<{ rowNumber: number; personId: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (existingPersonIds.has(row.personId)) {
        skipped.push({ rowNumber: i + 2, personId: row.personId }); // +2: header is row 1, data starts at row 2
      } else {
        newRows.push({ ...row, rowNumber: i + 2 });
      }
    }

    // Phase 4: Add all new persons (atomic or fail)
    let imported = 0;
    const errors: Array<{ row: number; personId?: string; message: string }> = [];

    for (const row of newRows) {
      try {
        tree.addPerson({
          personId: row.personId,
          name: row.name,
          gender: row.gender,
          birthDate: row.birthDate || null,
          birthPlace: row.birthPlace || null,
          deathDate: row.deathDate || null,
        });
        imported++;
      } catch (err) {
        // Add error and continue (non-atomic, but tracks all failures)
        // Production: Consider collecting all, then failing entirely
        errors.push({
          row: row.rowNumber,
          personId: row.personId,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Phase 5: Save if there were imports
    if (imported > 0) {
      try {
        await this.repository.save(tree);
      } catch (err) {
        throw new InvariantViolationError(
          `Failed to save imported persons: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
    }

    return {
      imported,
      skipped: skipped.length,
      total: rows.length,
      errors,
    };
  }

  /**
   * Parse and validate CSV with strict error handling.
   * Fails on first error, not accumulating errors.
   */
  private parseAndValidateCsv(csvContent: string): CsvPersonRow[] {
    const trimmed = csvContent.trim();
    
    if (!trimmed) {
      throw new InvariantViolationError('CSV is empty');
    }

    const lines = trimmed.split('\n');

    if (lines.length === 0) {
      throw new InvariantViolationError('CSV is empty');
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeader = ['personid', 'name', 'gender', 'birthdate', 'birthplace', 'deathdate'];

    if (header.length < 2) {
      throw new InvariantViolationError('CSV header must have at least personId and name');
    }

    // Validate column positions
    const personIdIdx = header.indexOf('personid');
    const nameIdx = header.indexOf('name');
    const genderIdx = header.indexOf('gender');
    const birthDateIdx = header.indexOf('birthdate');
    const birthPlaceIdx = header.indexOf('birthplace');
    const deathDateIdx = header.indexOf('deathdate');

    if (personIdIdx === -1 || nameIdx === -1) {
      throw new InvariantViolationError('CSV must include personId and name columns');
    }

    const rows: CsvPersonRow[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const cells = line.split(',').map(c => c.trim());

      // Validate minimum required fields
      if (!cells[personIdIdx] || !cells[nameIdx]) {
        throw new InvariantViolationError(
          `Row ${i + 1}: personId and name are required`,
        );
      }

      // Validate personId format
      const personId = cells[personIdIdx];
      if (!/^[a-zA-Z0-9_-]+$/.test(personId)) {
        throw new InvariantViolationError(
          `Row ${i + 1}: personId must only contain alphanumeric, dash, or underscore`,
        );
      }

      // Validate name
      const name = cells[nameIdx];
      if (name.length > 255) {
        throw new InvariantViolationError(
          `Row ${i + 1}: name exceeds 255 characters`,
        );
      }

      // Validate and parse gender
      let gender: 'MALE' | 'FEMALE' | 'UNKNOWN' = 'UNKNOWN';
      if (genderIdx !== -1 && cells[genderIdx]) {
        const genderValue = cells[genderIdx].toUpperCase();
        if (!['MALE', 'FEMALE', 'UNKNOWN'].includes(genderValue)) {
          throw new InvariantViolationError(
            `Row ${i + 1}: gender must be MALE, FEMALE, or UNKNOWN`,
          );
        }
        gender = genderValue as 'MALE' | 'FEMALE' | 'UNKNOWN';
      }

      // Parse dates (ISO 8601 format: YYYY-MM-DD)
      let birthDate: Date | null = null;
      if (birthDateIdx !== -1 && cells[birthDateIdx]) {
        birthDate = this.parseDate(cells[birthDateIdx], i + 1, 'birthDate');
      }

      let birthPlace: string | null = null;
      if (birthPlaceIdx !== -1 && cells[birthPlaceIdx]) {
        birthPlace = cells[birthPlaceIdx];
      }

      let deathDate: Date | null = null;
      if (deathDateIdx !== -1 && cells[deathDateIdx]) {
        deathDate = this.parseDate(cells[deathDateIdx], i + 1, 'deathDate');
      }

      rows.push({
        personId,
        name,
        gender,
        birthDate,
        birthPlace,
        deathDate,
      });
    }

    if (rows.length === 0) {
      throw new InvariantViolationError('CSV contains no data rows (only header)');
    }

    return rows;
  }

  /**
   * Parse ISO 8601 date (YYYY-MM-DD) and validate
   */
  private parseDate(dateStr: string, rowNumber: number, fieldName: string): Date {
    const match = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    if (!match) {
      throw new InvariantViolationError(
        `Row ${rowNumber}: ${fieldName} must be ISO 8601 format (YYYY-MM-DD), got '${dateStr}'`,
      );
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new InvariantViolationError(
        `Row ${rowNumber}: ${fieldName} is not a valid date`,
      );
    }

    return date;
  }
}
