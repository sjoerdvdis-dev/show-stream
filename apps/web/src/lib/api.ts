import { ApiError, createApiClient } from '@workspace/api-client';

/** Caddy sends `/api` to the API, as Vite does under `pnpm dev`, so that the session cookie is first-party. */
export const api = createApiClient('/api');

export const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;
