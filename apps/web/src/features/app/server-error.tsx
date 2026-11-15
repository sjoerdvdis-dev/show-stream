import { useRouter } from '@tanstack/react-router';
import { ApiError } from '@workspace/api-client';
import { Button } from '@workspace/ui/components/button';
import { EmptyState } from '@workspace/ui/patterns/states';
import { CircleAlert, ServerOff } from 'lucide-react';

/**
 * No answer arrived, or Caddy answered for an API it could not reach. Either way the session is
 * unknown rather than ended, so this is no reason to log in.
 */
const isUnreachable = (error: unknown) =>
	error instanceof ApiError && (error.code === 'network_error' || [502, 503, 504].includes(error.status));

/**
 * What a page shows when it cannot load, such as when the session check fails. A 401 never ends
 * up here: it goes to login.
 */
export const ServerError = ({ error }: { error: unknown }) => {
	const router = useRouter();
	const unreachable = isUnreachable(error);

	return (
		<main role="alert" className="flex min-h-dvh flex-col items-center justify-center bg-background">
			<EmptyState
				icon={unreachable ? ServerOff : CircleAlert}
				title={unreachable ? 'Cannot reach the server' : 'Something went wrong'}
				description={
					unreachable
						? 'ShowStream could not connect to its server. Check your connection, or that the server is running.'
						: 'This page could not load.'
				}
				action={
					<Button variant="outline" onClick={() => void router.invalidate()}>
						Retry
					</Button>
				}
			/>
		</main>
	);
};
