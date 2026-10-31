'use client';

import { Toaster } from '@workspace/ui/components/sonner';
import { useNotificationToaster } from '@/hooks/use-notification-toaster';

export default function DashboardToaster() {
	useNotificationToaster();
	return <Toaster />;
}
