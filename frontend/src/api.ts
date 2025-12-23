export type TreeListItem = {
  treeId: string;
  name: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  personCount: number;
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

export type RenderNode = { id: string; displayName: string };
export type RenderEdgeData = { id: string; source: string; target: string; type: 'spouse' | 'parent-child' };
export type TreeRenderV1 = {
  version: 'v1';
  treeId: string;
  nodes: RenderNode[];
  edges: RenderEdgeData[];
  spouseEdges?: { personAId: string; personBId: string }[]; // deprecated, kept for compatibility
  parentChildEdges?: { personAId: string; personBId: string }[]; // deprecated, kept for compatibility
};

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
  const res = await fetch(`${base}/trees`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch trees: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getPublicRenderData(treeId: string): Promise<TreeRenderV1> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/public/trees/${encodeURIComponent(treeId)}/render-data`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch render data: ${res.status} ${text}`);
  }
  return res.json();
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
