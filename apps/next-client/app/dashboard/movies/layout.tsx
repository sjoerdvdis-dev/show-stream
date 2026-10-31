import { MoviesBrowserContextProvider } from '@/hooks/use-movies-browser';

export default function MoviesLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <MoviesBrowserContextProvider>{children}</MoviesBrowserContextProvider>;
}
