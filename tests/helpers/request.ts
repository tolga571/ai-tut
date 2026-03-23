/**
 * HTTP Request Helpers
 *
 * Next.js 14 route handler'larını doğrudan test etmek için
 * Web API uyumlu Request nesneleri oluşturur.
 *
 * Kullanım:
 *   import { makeRequest, makeAuthRequest } from '../helpers/request.ts';
 *   const req = makeRequest('/api/auth/register', { name: 'Test', ... });
 */

const BASE_URL = 'http://localhost:3000';

/** JSON POST isteği oluştur */
export function makeRequest(
  path: string,
  body: unknown,
  options: { method?: string; headers?: Record<string, string> } = {}
): Request {
  return new Request(`${BASE_URL}${path}`, {
    method: options.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });
}

/** GET isteği oluştur */
export function makeGetRequest(
  path: string,
  options: { headers?: Record<string, string> } = {}
): Request {
  return new Request(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/** Oturumlu (mock session token) istek oluştur */
export function makeAuthRequest(
  path: string,
  body: unknown,
  sessionToken = 'mock-session-token'
): Request {
  return makeRequest(path, body, {
    headers: {
      Cookie: `next-auth.session-token=${sessionToken}`,
    },
  });
}

/** Response body'sini JSON olarak parse et */
export async function parseJson<T = unknown>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}
