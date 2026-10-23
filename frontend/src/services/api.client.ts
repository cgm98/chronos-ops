export const currentUserId = {
  get: () => localStorage.getItem('chronos_user_id') || 'u1',
  set: (id: string) => localStorage.setItem('chronos_user_id', id)
};

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (!headers.has('X-User-Id')) {
    headers.set('X-User-Id', currentUserId.get());
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const err = await res.json();
      if (err.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}
