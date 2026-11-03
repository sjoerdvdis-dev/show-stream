'use client';

import { Toaster } from '@/components/ui/sonner';
import { useNotificationToaster } from '@/hooks/use-notification-toaster';

export default function DashboardToaster() {
	useNotificationToaster();
	return <Toaster />;
}
