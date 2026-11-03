import { ApiError, createApiClient } from '@workspace/api-client';
import { endpoints } from '@workspace/contract/endpoints';
import type { ImageKind } from '@workspace/contract/library';

/** Caddy sends `/api` to the API, as Vite does under `pnpm dev`, so that the session cookie is first-party. */
const apiBase = '/api';

export const api = createApiClient(apiBase);

export const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

export const isNotFound = (error: unknown) => error instanceof ApiError && error.code === 'not_found';

/**
 * Where a browser loads a movie's stored art, for an `<img>`, which cannot go through `api`. The
 * path comes from the contract. A title without that art answers 404, and `MediaImage` falls back.
 */
export const movieImageUrl = (id: number, kind: ImageKind) =>
	`${apiBase}${endpoints.libraryMovieImage.path.replace(':id', String(id)).replace(':kind', kind)}`;
