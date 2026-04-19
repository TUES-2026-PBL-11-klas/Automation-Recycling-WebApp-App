const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const base: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

async function handle(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

// ── Auth ────────────────────────────────────────────────────────────

export async function loginUser(data: { email: string; password: string }) {
  return handle(await fetch(`${API_URL}/auth/login`, { ...base, method: 'POST', body: JSON.stringify(data) }));
}

export async function registerUser(data: { name: string; email: string; password: string; phoneNumber?: string }) {
  return handle(await fetch(`${API_URL}/auth/register`, { ...base, method: 'POST', body: JSON.stringify(data) }));
}

export async function getMe() {
  return handle(await fetch(`${API_URL}/auth/me`, { ...base, method: 'GET' }));
}

export async function logoutUser() {
  return handle(await fetch(`${API_URL}/auth/logout`, { ...base, method: 'POST' }));
}

// ── Districts ───────────────────────────────────────────────────────

export async function getDistricts() {
  return handle(await fetch(`${API_URL}/districts`, { ...base, method: 'GET' }));
}

// ── Electronics ─────────────────────────────────────────────────────

export async function getElectronics() {
  return handle(await fetch(`${API_URL}/electronics`, { ...base, method: 'GET' }));
}

// ── Pickup Requests (user) ──────────────────────────────────────────

export async function getMyRequests() {
  return handle(await fetch(`${API_URL}/pickup-requests/my`, { ...base, method: 'GET' }));
}

export async function getRequest(id: string) {
  return handle(await fetch(`${API_URL}/pickup-requests/${id}`, { ...base, method: 'GET' }));
}

export async function createRequest(data: unknown) {
  return handle(await fetch(`${API_URL}/pickup-requests`, { ...base, method: 'POST', body: JSON.stringify(data) }));
}

export async function cancelRequest(id: string) {
  return handle(await fetch(`${API_URL}/pickup-requests/${id}/cancel`, { ...base, method: 'PATCH' }));
}

// ── Admin ───────────────────────────────────────────────────────────

export async function adminGetRequests(params?: { status?: string; districtId?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.districtId) query.set('districtId', params.districtId);
  const qs = query.toString() ? `?${query}` : '';
  return handle(await fetch(`${API_URL}/admin/requests${qs}`, { ...base, method: 'GET' }));
}

export async function adminUpdateRequest(id: string, data: unknown) {
  return handle(await fetch(`${API_URL}/admin/requests/${id}`, { ...base, method: 'PATCH', body: JSON.stringify(data) }));
}

export async function adminDeleteRequest(id: string) {
  return handle(await fetch(`${API_URL}/admin/requests/${id}`, { ...base, method: 'DELETE' }));
}

export async function adminGetUsers() {
  return handle(await fetch(`${API_URL}/admin/users`, { ...base, method: 'GET' }));
}

export async function adminGetDistricts() {
  return handle(await fetch(`${API_URL}/admin/districts`, { ...base, method: 'GET' }));
}

export async function adminScheduleRoute(data: { districtId: string; routeDate: string; vehicleId?: string; teamId?: string }) {
  return handle(await fetch(`${API_URL}/admin/routes/schedule`, { ...base, method: 'POST', body: JSON.stringify(data) }));
}
