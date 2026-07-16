export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const csrfToken = () =>
  sessionStorage.getItem('atlas_csrf') ??
  document.cookie
    .split('; ')
    .find((value) => value.startsWith('atlas_csrf='))
    ?.split('=')[1] ??
  '';
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.method && init.method !== 'GET'
        ? { Origin: window.location.origin, 'x-csrf-token': csrfToken() }
        : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}
