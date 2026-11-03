import type { Response } from 'express';
import { notFound } from './errors';

type SendFileOptions = Parameters<Response['sendFile']>[1];

/**
 * Sends a file below `root`, which limits the file to that folder, and limits the check for
 * dot folders to `file`. Headers given in the options are only sent with the file.
 *
 * A client that hangs up partway is not a failure, because players drop segments they no
 * longer need. A file that is not there becomes `notFound(label)`, and anything else rejects.
 */
export const sendFile = (res: Response, file: string, options: SendFileOptions & { root: string }, label: string) =>
	new Promise<void>((resolve, reject) => {
		res.sendFile(file, options, (error: (Error & { code?: string; status?: number }) | undefined) => {
			if (!error || error.code === 'ECONNABORTED') {
				resolve();
			} else if (error.status === 404) {
				reject(notFound(label));
			} else {
				reject(error);
			}
		});
	});
