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

export type RenderNode = { id: string; displayName: string };
export type RenderEdge = { personAId: string; personBId: string };
export type TreeRenderV1 = {
  version: 'v1';
  treeId: string;
  nodes: RenderNode[];
  spouseEdges: RenderEdge[];
  parentChildEdges: RenderEdge[];
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
