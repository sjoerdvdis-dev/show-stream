import Hls from 'hls.js';
import { Maximize, Minimize, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react';
import {
	useCallback,
	useEffect,
	useEffectEvent,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
	type ReactNode,
} from 'react';
import { Button } from '@workspace/ui/components/button';
import { Slider } from '@workspace/ui/components/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { cn } from '@workspace/ui/lib/utils';
import { ErrorState } from '@workspace/ui/patterns/states';

/** How long the controls stay after the last pointer movement or key while the video plays. */
const hideControlsAfter = 3000;

const mediaEvents = ['play', 'pause', 'ended', 'timeupdate', 'durationchange', 'loadedmetadata', 'volumechange'];

/** Re-renders whenever the media element reports a change, and reads its state from it. */
const useMediaState = (media: HTMLMediaElement | null) => {
	const subscribe = useCallback(
		(onChange: () => void) => {
			if (!media) return () => {};
			for (const type of mediaEvents) media.addEventListener(type, onChange);
			return () => {
				for (const type of mediaEvents) media.removeEventListener(type, onChange);
			};
		},
		[media],
	);
	const paused = useSyncExternalStore(subscribe, () => media?.paused ?? true);
	const currentTime = useSyncExternalStore(subscribe, () => media?.currentTime ?? 0);
	const duration = useSyncExternalStore(subscribe, () => media?.duration ?? Number.NaN);
	const volume = useSyncExternalStore(subscribe, () => media?.volume ?? 1);
	const muted = useSyncExternalStore(subscribe, () => media?.muted ?? false);
	return { paused, currentTime, duration: Number.isFinite(duration) ? duration : 0, volume, muted };
};

const subscribeFullscreen = (onChange: () => void) => {
	document.addEventListener('fullscreenchange', onChange);
	return () => document.removeEventListener('fullscreenchange', onChange);
};

/** Whether the player container is fullscreen, as the browser reports it. */
const useFullscreen = (container: HTMLElement | null) =>
	useSyncExternalStore(subscribeFullscreen, () => container !== null && document.fullscreenElement === container);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Formats seconds as `m:ss`, or `h:mm:ss` from an hour. */
const formatTime = (seconds: number) => {
	const whole = Math.floor(Math.max(seconds, 0));
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);
	const rest = String(whole % 60).padStart(2, '0');
	return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${minutes}:${rest}`;
};

const togglePlay = (media: HTMLMediaElement) => {
	// A refused play, such as autoplay without a gesture, leaves the video paused, which the controls show.
	if (media.paused) void media.play().catch(() => {});
	else media.pause();
};

const seekTo = (media: HTMLMediaElement, seconds: number) => {
	const duration = Number.isFinite(media.duration) ? media.duration : 0;
	media.currentTime = clamp(seconds, 0, duration);
};

const seekBy = (media: HTMLMediaElement, seconds: number) => seekTo(media, media.currentTime + seconds);

/** Sets the volume from a percentage, muting at zero and unmuting above it. */
const setVolumePercent = (media: HTMLMediaElement, percent: number) => {
	media.volume = clamp(percent / 100, 0, 1);
	media.muted = percent === 0;
};

/** Sets the volume in tenths, so that steps do not drift, and unmutes when it goes up. */
const changeVolume = (media: HTMLMediaElement, change: number) => {
	media.volume = clamp(Math.round((media.volume + change) * 10) / 10, 0, 1);
	if (change > 0) media.muted = false;
};

const toggleMute = (media: HTMLMediaElement) => {
	media.muted = !media.muted;
};

/**
 * Puts the player container in fullscreen, so that the controls stay over the video. iPhone Safari cannot
 * do that for an element, only for the video itself in its own player.
 */
const toggleFullscreen = (media: HTMLMediaElement, container: HTMLElement | null) => {
	if (document.fullscreenElement) {
		void document.exitFullscreen().catch(() => {});
	} else if (container?.requestFullscreen) {
		void container.requestFullscreen().catch(() => {});
	} else {
		(media as HTMLMediaElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
	}
};

const nonTextInputs = new Set(['button', 'checkbox', 'color', 'file', 'image', 'radio', 'range', 'reset', 'submit']);

/** Whether typing goes into the element, so that keys must reach it and not the player. */
const isTextField = (target: EventTarget | null) => {
	if (!(target instanceof HTMLElement)) return false;
	if (target instanceof HTMLInputElement) return !nonTextInputs.has(target.type);
	return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
};

/** Whether Space presses the element, as on a button, so that it must not also play or pause. */
const pressesWithSpace = (target: EventTarget | null) =>
	target instanceof Element &&
	target.closest('button, a[href], summary, [role="button"], [role="checkbox"], [role="switch"]') !== null;

/** The first value of a slider change, which Base UI reports as a number or an array. */
const sliderValue = (value: number | readonly number[]) => (typeof value === 'number' ? value : (value[0] ?? 0));

/** Shows the controls, and hides them again after a while unless something wakes them. */
const useAutoHide = () => {
	const [awake, setAwake] = useState(true);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const wake = useCallback(() => {
		setAwake(true);
		clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setAwake(false), hideControlsAfter);
	}, []);
	useEffect(() => () => clearTimeout(timerRef.current), []);
	return { awake, wake };
};

// Ghost buttons hover to `muted`, which is light in the light theme, so over video they hover on the scrim instead.
const overlayButtonClassName =
	'hover:bg-overlay-foreground/15 hover:text-overlay-foreground dark:hover:bg-overlay-foreground/15';
const overlaySliderClassName = '[&_[data-slot=slider-track]]:bg-overlay-foreground/30';

const ControlButton = ({
	label,
	shortcut,
	onClick,
	children,
}: {
	label: string;
	shortcut: string;
	onClick: () => void;
	children: ReactNode;
}) => (
	<Tooltip>
		<TooltipTrigger
			render={
				<Button
					variant="ghost"
					size="icon-lg"
					aria-label={label}
					aria-keyshortcuts={shortcut}
					className={overlayButtonClassName}
					onClick={onClick}
				/>
			}
		>
			{children}
		</TooltipTrigger>
		<TooltipContent>
			{label} ({shortcut})
		</TooltipContent>
	</Tooltip>
);

type PlayerControlsProps = {
	/** The video the controls drive. */
	media: HTMLMediaElement | null;
	/** The element that goes fullscreen, holding the video and the controls. */
	container: HTMLElement | null;
	/** Shown at the top while the controls show. */
	title?: string;
	className?: string;
};

/**
 * Play, seek, volume and fullscreen controls laid over a video, with keyboard shortcuts on the whole page outside
 * text fields: Space or K, Left and Right to seek, Up and Down for volume, M and F. They hide while the video plays.
 */
export const PlayerControls = ({ media, container, title, className }: PlayerControlsProps) => {
	const { paused, currentTime, duration, volume, muted } = useMediaState(media);
	const fullscreen = useFullscreen(container);
	const { awake, wake } = useAutoHide();
	// The slider names its thumb from a label element, not from `aria-label`.
	const seekLabelId = useId();
	const volumeLabelId = useId();
	const silent = muted || volume === 0;
	const VolumeIcon = silent ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
	const visible = paused || awake;

	useEffect(() => {
		if (!media) return;
		const onKeyDown = (event: KeyboardEvent) => {
			wake();
			// A slider or another widget that handled the key has prevented its default.
			if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
			if (isTextField(event.target)) return;
			const key = event.key.toLowerCase();
			if (key === ' ' && pressesWithSpace(event.target)) return;
			if (key === ' ' || key === 'k') {
				event.preventDefault();
				togglePlay(media);
			} else if (key === 'arrowleft' || key === 'arrowright') {
				event.preventDefault();
				seekBy(media, key === 'arrowleft' ? -10 : 10);
			} else if (key === 'arrowup' || key === 'arrowdown') {
				event.preventDefault();
				changeVolume(media, key === 'arrowup' ? 0.1 : -0.1);
			} else if (key === 'm') {
				toggleMute(media);
			} else if (key === 'f') {
				toggleFullscreen(media, container);
			}
		};
		document.addEventListener('keydown', onKeyDown);
		media.addEventListener('play', wake);
		container?.addEventListener('pointermove', wake);
		container?.addEventListener('pointerdown', wake);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			media.removeEventListener('play', wake);
			container?.removeEventListener('pointermove', wake);
			container?.removeEventListener('pointerdown', wake);
		};
	}, [media, container, wake]);

	return (
		<TooltipProvider>
			<div
				role="group"
				aria-label="Player controls"
				data-state={visible ? 'visible' : 'hidden'}
				className={cn(
					'absolute inset-0 flex flex-col justify-between text-overlay-foreground transition-opacity duration-300 data-[state=hidden]:cursor-none data-[state=hidden]:opacity-0',
					className,
				)}
			>
				<div className="bg-linear-to-b from-overlay/90 to-transparent px-4 pt-3 pb-10">
					{title ? <p className="truncate text-sm font-medium">{title}</p> : null}
				</div>
				{/* Clicking the picture plays and pauses with a mouse. A touch only shows the controls. */}
				<div
					aria-hidden="true"
					className="flex-1"
					onPointerUp={(event) => {
						if (media && event.pointerType === 'mouse' && event.button === 0) togglePlay(media);
					}}
					onDoubleClick={() => media && toggleFullscreen(media, container)}
				/>
				<div className="flex flex-col gap-1 bg-linear-to-t from-overlay/90 via-overlay/75 to-transparent px-2 pt-10 pb-1 sm:px-4 sm:pb-2">
					<span id={seekLabelId} className="sr-only">
						Seek
					</span>
					<Slider
						aria-labelledby={seekLabelId}
						className={cn('px-2 py-2', overlaySliderClassName)}
						min={0}
						// Base UI asks for a max above the min, even while there is no duration yet.
						max={duration || 1}
						step={5}
						value={[Math.min(currentTime, duration)]}
						disabled={duration === 0}
						onValueChange={(value) => media && seekTo(media, sliderValue(value))}
					/>
					<div className="flex items-center gap-1">
						<ControlButton label={paused ? 'Play' : 'Pause'} shortcut="K" onClick={() => media && togglePlay(media)}>
							{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
						</ControlButton>
						<ControlButton label={muted ? 'Unmute' : 'Mute'} shortcut="M" onClick={() => media && toggleMute(media)}>
							<VolumeIcon aria-hidden="true" />
						</ControlButton>
						<span id={volumeLabelId} className="sr-only">
							Volume
						</span>
						<Slider
							aria-labelledby={volumeLabelId}
							className={cn('shrink-0 data-horizontal:w-16 sm:data-horizontal:w-24', overlaySliderClassName)}
							min={0}
							max={100}
							step={5}
							value={[silent ? 0 : Math.round(volume * 100)]}
							onValueChange={(value) => media && setVolumePercent(media, sliderValue(value))}
						/>
						<p className="ml-3 font-mono text-xs whitespace-nowrap tabular-nums">
							<span>{formatTime(currentTime)}</span>
							<span aria-hidden="true"> / </span>
							<span className="sr-only"> of </span>
							<span>{formatTime(duration)}</span>
						</p>
						<span className="flex-1" />
						<ControlButton
							label={fullscreen ? 'Exit full screen' : 'Full screen'}
							shortcut="F"
							onClick={() => media && toggleFullscreen(media, container)}
						>
							{fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
						</ControlButton>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
};

type VideoPlayerProps = {
	/** The HLS playlist URL. */
	src: string;
	title: string;
	poster?: string;
	/** Called on a 401 from any request hls.js makes, so that the app can send the user to log in. */
	onUnauthorized: () => void;
	/** Called when playback cannot go on, with hls.js's error detail or `mediaError`. The player shows the error. */
	onFatalError: (reason: string) => void;
	/** Turns on hls.js's debug log. Pass `import.meta.env.DEV`, so that it stays off in a build. */
	debug?: boolean;
	className?: string;
};

/** Plays an HLS stream through hls.js, or natively where the browser plays HLS itself, with `PlayerControls` over it. */
export const VideoPlayer = ({
	src,
	title,
	poster,
	onUnauthorized,
	onFatalError,
	debug = false,
	className,
}: VideoPlayerProps) => {
	const [video, setVideo] = useState<HTMLVideoElement | null>(null);
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	// The failure belongs to one source, so that a new source starts clean.
	const [failedSrc, setFailedSrc] = useState<string>();
	const failed = failedSrc === src;
	const reportUnauthorized = useEffectEvent(() => onUnauthorized());
	const reportFatal = useEffectEvent((failingSrc: string, reason: string) => {
		setFailedSrc(failingSrc);
		onFatalError(reason);
	});

	useEffect(() => {
		if (!video) return;

		if (!Hls.isSupported()) {
			// Safari plays HLS itself. It does not say why a request failed, so a 401 shows as an error here.
			const onError = () => reportFatal(src, 'mediaError');
			video.addEventListener('error', onError);
			video.setAttribute('src', src);
			return () => video.removeEventListener('error', onError);
		}

		const hls = new Hls({ debug });
		hls.on(Hls.Events.ERROR, (_event, data) => {
			if (data.response?.code === 401) reportUnauthorized();
			else if (data.fatal) reportFatal(src, data.details);
		});
		hls.loadSource(src);
		hls.attachMedia(video);
		return () => hls.destroy();
	}, [video, src, debug]);

	return (
		<div ref={setContainer} className={cn('relative aspect-video w-full overflow-hidden bg-overlay', className)}>
			<video ref={setVideo} aria-label={title} poster={poster} playsInline className="size-full object-contain" />
			{failed ? (
				<ErrorState
					className="absolute inset-0 bg-card"
					title="This title could not be played."
					description="The stream stopped with an error."
				/>
			) : (
				<PlayerControls media={video} container={container} title={title} />
			)}
		</div>
	);
};
