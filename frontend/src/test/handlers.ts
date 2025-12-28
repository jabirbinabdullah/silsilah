import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000';

export const handlers = [
  http.post(`${API_BASE}/trees/:treeId/persons`, async ({ request }) => {
    const { personId } = await request.json();
    return HttpResponse.json({ personId }, { status: 200 });
  }),
  http.post(`${API_BASE}/trees/:treeId/relationships/parent-child`, async ({ request }) => {
    const body = await request.json();
    if (!body.parentId || !body.childId) {
      return new HttpResponse('Invalid payload', { status: 400 });
    }
    return HttpResponse.json({ message: 'ok' }, { status: 200 });
  }),
  http.post(`${API_BASE}/trees/:treeId/relationships/spouse`, async ({ request }) => {
    const body = await request.json();
    if (!body.personAId || !body.personBId) {
      return new HttpResponse('Invalid payload', { status: 400 });
    }
    return HttpResponse.json({ message: 'ok' }, { status: 200 });
  }),
];
