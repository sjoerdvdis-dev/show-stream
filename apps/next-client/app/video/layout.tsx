import SessionGuard from '@/components/session-guard';

export default function VideoLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <SessionGuard>{children}</SessionGuard>;
}
