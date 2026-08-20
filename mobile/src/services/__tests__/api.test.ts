import { createApiClient } from '../api';

describe('createApiClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('blocks requests when the public API URL is not configured', async () => {
    const client = createApiClient();

    expect(client.isConfigured).toBe(false);
    await expect(client.request('/feed')).rejects.toThrow(
      'API is not configured. Set EXPO_PUBLIC_API_URL.',
    );
  });

  it('uses the configured base URL and preserves custom headers', async () => {
    const response = {
      ok: true,
      json: jest.fn().mockResolvedValue({ ready: true }),
      status: 200,
    } as unknown as Response;
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const client = createApiClient('https://api.example.com');

    await expect(
      client.request<{ ready: boolean }>('/health', {
        headers: { Authorization: 'Bearer test-token' },
      }),
    ).resolves.toEqual({ ready: true });

    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/health', {
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });
  });

  it('surfaces unsuccessful response statuses', async () => {
    const response = { ok: false, status: 503 } as Response;
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const client = createApiClient('https://api.example.com');

    await expect(client.request('/health')).rejects.toThrow('Request failed (503)');
  });
});
