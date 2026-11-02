import { useMutation } from '@tanstack/react-query';
import { useRouteContext } from '@tanstack/react-router';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export const useLogout = () => {
	const { onLoggedOut } = useRouteContext({ from: '/_app' });

	return useMutation({
		mutationFn: () => api.logout(),
		onSuccess: onLoggedOut,
		onError: (error) => {
			toast.error(`Could not log out. ${error.message}`, { closeButton: true });
		},
	});
};
