import { Film, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@workspace/ui/lib/utils';

const aspects = {
	poster: 'aspect-2/3',
	backdrop: 'aspect-video',
	/** The caller sizes it, as a hero's backdrop that fills its section does. */
	fill: '',
};

type MediaImageProps = {
	/** Any URL: TMDB's today, the API's image cache later. Missing art is `undefined` or `null`. */
	src: string | null | undefined;
	/** The title it shows. An empty `alt` makes the image and its fallback decorative. */
	alt: string;
	aspect?: keyof typeof aspects;
	/** The icon on the fallback. */
	fallbackIcon?: LucideIcon;
	/** `eager` for art above the fold, such as a hero's backdrop. */
	loading?: 'lazy' | 'eager';
	sizes?: string;
	className?: string;
	imageClassName?: string;
};

/**
 * Poster or backdrop art. It keeps its size while the image loads, and shows a quiet fallback with
 * the title when the image is missing or fails, so that a grid never shows a broken image.
 */
export const MediaImage = ({
	src,
	alt,
	aspect = 'poster',
	fallbackIcon: FallbackIcon = Film,
	loading = 'lazy',
	sizes,
	className,
	imageClassName,
}: MediaImageProps) => {
	// Kept per source, so that a new `src` loads again without an effect.
	const [loadedSrc, setLoadedSrc] = useState<string>();
	const [failedSrc, setFailedSrc] = useState<string>();
	const showFallback = !src || failedSrc === src;
	const decorative = alt === '';

	return (
		<div className={cn('relative overflow-hidden bg-muted', aspects[aspect], className)}>
			{showFallback ? (
				<div
					role={decorative ? undefined : 'img'}
					aria-label={decorative ? undefined : alt}
					aria-hidden={decorative ? true : undefined}
					className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground"
				>
					<FallbackIcon aria-hidden="true" className="size-8 shrink-0" />
					{decorative ? null : (
						<span aria-hidden="true" className="line-clamp-3 text-sm font-medium">
							{alt}
						</span>
					)}
				</div>
			) : (
				<img
					src={src}
					alt={alt}
					sizes={sizes}
					loading={loading}
					decoding="async"
					onLoad={() => setLoadedSrc(src)}
					onError={() => setFailedSrc(src)}
					className={cn(
						'absolute inset-0 size-full object-cover transition-opacity duration-300',
						loadedSrc === src ? 'opacity-100' : 'opacity-0',
						imageClassName,
					)}
				/>
			)}
		</div>
	);
};
