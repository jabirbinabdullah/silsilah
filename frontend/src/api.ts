export type TreeListItem = {
  treeId: string;
  name: string;
  description?: string;
  visibility?: 'public' | 'private';
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  personCount: number;
  relationshipCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type TreeListResponse = {
  trees: TreeListItem[];
  total: number;
};

export type PersonDetails = {
  personId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: Date | null;
  birthPlace?: string | null;
  deathDate?: Date | null;
};

export type CreatePersonPayload = {
  personId: string;
  name: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
};

export type RenderNode = { readonly id: string; readonly displayName: string };
export type RenderEdgeData = { readonly id: string; readonly source: string; readonly target: string; readonly type: 'spouse' | 'parent-child' };
export type TreeRenderV1 = {
  readonly version: 'v1';
  readonly treeId: string;
  readonly nodes: readonly RenderNode[];
  readonly edges: readonly RenderEdgeData[];
  readonly spouseEdges?: readonly { readonly personAId: string; readonly personBId: string }[]; // deprecated, kept for compatibility
  readonly parentChildEdges?: readonly { readonly personAId: string; readonly personBId: string }[]; // deprecated, kept for compatibility
};

import { httpJson } from './utils/httpClient';

const getBaseUrl = (): string => {
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  const fromStorage = localStorage.getItem('apiBaseUrl') || undefined;
  return (fromStorage || fromEnv || 'http://localhost:3000').replace(/\/$/, '');
};

const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setApiConfig = (apiBaseUrl?: string, token?: string) => {
  if (apiBaseUrl !== undefined) localStorage.setItem('apiBaseUrl', apiBaseUrl);
  if (token !== undefined) localStorage.setItem('authToken', token);
};

export async function getTrees(): Promise<TreeListResponse> {
  const base = getBaseUrl();
  const token = getAuthToken();
  return httpJson(`${base}/api/trees`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function createTree(payload: {
  name: string;
  description?: string;
  visibility?: 'public' | 'private';
}): Promise<{ treeId: string; name: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  return httpJson(`${base}/api/trees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export async function duplicateTree(
  sourceTreeId: string,
  newName: string
): Promise<{ treeId: string; name: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  return httpJson(`${base}/api/trees/${encodeURIComponent(sourceTreeId)}/duplicate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ newName }),
  });
}

export async function getPublicRenderData(treeId: string): Promise<TreeRenderV1> {
  const base = getBaseUrl();
  return httpJson(`${base}/public/trees/${encodeURIComponent(treeId)}/render-data`);
}

export async function createPerson(treeId: string, payload: CreatePersonPayload): Promise<{ personId: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  return httpJson(`${base}/api/trees/${encodeURIComponent(treeId)}/persons`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export async function establishParentChild(
  treeId: string,
  payload: { parentId: string; childId: string }
): Promise<{ message: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  return httpJson(`${base}/api/trees/${encodeURIComponent(treeId)}/relationships/parent-child`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export async function establishSpouseRelationship(
  treeId: string,
  payload: { personAId: string; personBId: string }
): Promise<{ message: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  return httpJson(`${base}/api/trees/${encodeURIComponent(treeId)}/relationships/spouse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export async function getPersonDetails(treeId: string, personId: string): Promise<PersonDetails> {
  const base = getBaseUrl();
  const res = await fetch(
    `${base}/public/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}`
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch person: ${res.status} ${text}`);
  }
  return res.json();
}

export function formatDate(date?: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatGender(gender?: string): string {
  if (!gender) return 'Unknown';
  const g = gender.toUpperCase();
  if (g === 'MALE') return 'Male';
  if (g === 'FEMALE') return 'Female';
  return 'Unknown';
}

export async function findDuplicates(
  treeId: string,
  name: string,
  birthDate?: string | null
): Promise<Array<{ personId: string; displayName: string; similarity: number }>> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const params = new URLSearchParams({ name });
  if (birthDate) params.append('birthDate', birthDate);
  const res = await fetch(`${base}/api/trees/${encodeURIComponent(treeId)}/persons/find-duplicates?${params}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    // On 404 or error, return empty list (no duplicates found)
    return [];
  }
  return res.json().catch(() => []);
}

export async function mergePerson(
  treeId: string,
  sourcePersonId: string,
  targetPersonId: string,
  fieldsToKeep?: { name?: boolean; gender?: boolean; birthDate?: boolean; deathDate?: boolean; birthPlace?: boolean }
): Promise<{ personId: string; message: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  return httpJson(`${base}/api/trees/${encodeURIComponent(treeId)}/persons/merge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      sourcePersonId,
      targetPersonId,
      fieldsToKeep: fieldsToKeep || {},
    }),
  });
}

export async function updateTree(
  treeId: string,
  payload: { name?: string; description?: string; visibility?: 'public' | 'private' }
): Promise<{ treeId: string; message: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const res = await fetch(`${base}/api/trees/${encodeURIComponent(treeId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to update tree: ${res.status} ${text}`);
  }
  return res.json();
}

export async function deleteTree(treeId: string): Promise<{ message: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const res = await fetch(`${base}/api/trees/${encodeURIComponent(treeId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete tree: ${res.status} ${text}`);
  }
  return res.json();
}

export type TreeExportData = {
  version: '1.0';
  tree: {
    id: string;
    name: string;
    description?: string;
  };
  persons: Array<{
    id: string;
    name: string;
    gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
    birthDate?: string | null;
    deathDate?: string | null;
    birthPlace?: string | null;
  }>;
  relationships: Array<{
    id?: string;
    type: 'parent-child' | 'spouse';
    personAId: string;
    personBId: string;
  }>;
};

export type ImportValidationResult = {
  valid: boolean;
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: Array<{ row: number; message: string }>;
  summary: {
    personCount: number;
    relationshipCount: number;
    duplicateCount: number;
    conflictCount: number;
  };
};

export type ImportPreviewData = {
  data: TreeExportData;
  validation: ImportValidationResult;
  existingDuplicates: Array<{
    importId: string;
    importName: string;
    existingId: string;
    existingName: string;
    similarity: number;
  }>;
};

async function exportTree(
  treeId: string,
  format: 'json-full' | 'json-minimal' | 'gedcom'
): Promise<Blob> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const res = await fetch(`${base}/api/trees/${encodeURIComponent(treeId)}/export?format=${format}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to export tree: ${res.status} ${text}`);
  }
  return res.blob();
}

export { exportTree };

export async function importTreePreview(
  file: File,
  targetTreeId?: string
): Promise<ImportPreviewData> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);
  if (targetTreeId) {
    formData.append('targetTreeId', targetTreeId);
  }

  const res = await fetch(`${base}/api/trees/import/preview`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to validate import: ${res.status} ${text}`);
  }
  return res.json();
}

export async function importTree(
  file: File,
  options: {
    createNewTree: boolean;
    newTreeName?: string;
    targetTreeId?: string;
    handleDuplicates?: 'skip' | 'merge' | 'replace';
  }
): Promise<{ treeId: string; imported: number; skipped: number; merged: number }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('createNewTree', options.createNewTree.toString());
  if (options.newTreeName) {
    formData.append('newTreeName', options.newTreeName);
  }
  if (options.targetTreeId) {
    formData.append('targetTreeId', options.targetTreeId);
  }
  if (options.handleDuplicates) {
    formData.append('handleDuplicates', options.handleDuplicates);
  }

  const res = await fetch(`${base}/api/trees/import`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to import tree: ${res.status} ${text}`);
  }
  return res.json();
}

export async function updatePerson(
  treeId: string,
  personId: string,
  payload: { name: string; gender: 'MALE' | 'FEMALE' | 'UNKNOWN'; birthDate?: string | null; birthPlace?: string | null; deathDate?: string | null }
): Promise<{ personId: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  return httpJson(`${base}/api/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export async function deletePerson(
  treeId: string,
  personId: string,
  options?: { cascade?: 'person-only' | 'with-children' | 'with-all-relationships' }
): Promise<{ message: string }> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const qp = options?.cascade ? `?cascade=${encodeURIComponent(options.cascade)}` : '';
  return httpJson(`${base}/api/trees/${encodeURIComponent(treeId)}/persons/${encodeURIComponent(personId)}${qp}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ============================================================================
// AUDIT & ACTIVITY LOG APIs
// ============================================================================

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: {
    userId: string;
    username: string;
    role: 'OWNER' | 'EDITOR' | 'VIEWER' | 'UNKNOWN' | string;
  };
  treeId: string;
  details?: Record<string, any>;
}

export interface PaginatedAuditResponse {
  entries: AuditEvent[];
  total: number;
}

/**
 * Fetch tree activity log (paginated)
 *
 * Returns raw backend audit entries.
 *
 * @param treeId Tree to fetch activity for
 * @param page The page number for pagination.
 * @param limit The number of items per page.
 * @returns Paginated tree activity feed
 */
export async function getTreeActivity(
  treeId: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedAuditResponse> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const offset = (page - 1) * limit;

  const queryParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return httpJson(
    `${base}/api/trees/${encodeURIComponent(treeId)}/activity?${queryParams}`,
    {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
}

/**
 * Fetch person change history (paginated)
 *
 * Fetches all changes related to a specific person in a tree.
 *
 * @param treeId Tree to fetch activity for
 * @param personId Person to filter by
 * @param page The page number for pagination.
 * @param limit The number of items per page.
 * @returns Paginated person change history
 */
export async function getPersonHistory(
  treeId: string,
  personId: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedAuditResponse> {
  const base = getBaseUrl();
  const token = getAuthToken();
  const offset = (page - 1) * limit;

  const queryParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return httpJson(
    `${base}/api/trees/${encodeURIComponent(
      treeId
    )}/persons/${encodeURIComponent(personId)}/history?${queryParams}`,
    {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
}
