import { Geist, Geist_Mono, Zain } from 'next/font/google';

import '@workspace/ui/globals.css';
// import "@/app/globals.css"
import { Providers } from '@/components/providers';
import { Metadata } from 'next';

const fontSans = Geist({
	subsets: ['latin'],
	variable: '--font-sans',
});

const fontMono = Geist_Mono({
	subsets: ['latin'],
	variable: '--font-mono',
});

const fontZain = Zain({
	weight: '400',
	subsets: ['latin'],
	variable: '--font-zain',
});

export const metadata: Metadata = {
	title: 'ShowStream client',
	description: 'The streaming client for ShowStream',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${fontSans.variable} ${fontMono.variable} ${fontZain.variable} font-sans antialiased w-screen h-screen`}>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
