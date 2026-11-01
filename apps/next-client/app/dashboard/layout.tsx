import DashboardToaster from '@/components/dashboard/dashboard-toaster';
import Sidebar from '@/components/dashboard/sidebar';
import SessionGuard from '@/components/session-guard';

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<SessionGuard>
			<div className="flex h-screen w-full">
				<Sidebar />
				{children}
				<DashboardToaster />
			</div>
		</SessionGuard>
	);
}
