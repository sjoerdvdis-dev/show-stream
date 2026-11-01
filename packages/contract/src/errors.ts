import { z } from 'zod';

/** Stable and machine-readable. Clients switch on these, never on `message`. */
export const apiErrorCodeSchema = z.enum(['invalid_request', 'unauthorized', 'not_found', 'internal_error']);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorDetailSchema = z.object({ path: z.string(), message: z.string() });
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

/** The body of every failed response. `details` lists the bad fields of a rejected request. */
export const apiErrorSchema = z.object({
	code: apiErrorCodeSchema,
	message: z.string(),
	details: z.array(apiErrorDetailSchema).optional(),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
