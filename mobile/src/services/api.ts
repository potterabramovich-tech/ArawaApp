const apiUrl = process.env.EXPO_PUBLIC_API_URL;

export const api = {
  isConfigured: Boolean(apiUrl),
  async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!apiUrl) throw new Error('API is not configured. Set EXPO_PUBLIC_API_URL.');
    const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.json() as Promise<T>;
  },
};

