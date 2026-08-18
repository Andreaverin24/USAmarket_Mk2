export const CLIENT_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function csrfToken() {
  const fromSession = window.sessionStorage.getItem('decorflavor_csrf');
  if (fromSession) return fromSession;
  return (
    document.cookie
      .split('; ')
      .find((value) => value.startsWith('atlas_csrf='))
      ?.split('=')[1] ??
    ''
  );
}

export async function clientRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${CLIENT_API_URL}${path}`, {
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
  if (!response.ok) throw new ApiError(response.status, `${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}
