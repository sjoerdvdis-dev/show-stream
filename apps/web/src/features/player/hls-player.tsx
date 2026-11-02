import Hls from 'hls.js';
import { useEffect, useRef, useState } from 'react';

type HlsPlayerProps = {
	playlistUrl: string;
	onSessionLost: () => void;
};

export const HlsPlayer = ({ playlistUrl, onSessionLost }: HlsPlayerProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		if (!Hls.isSupported()) {
			// Safari plays HLS itself.
			video.src = playlistUrl;
			return;
		}

		// eslint-disable-next-line turbo/no-undeclared-env-vars -- Vite sets this, and it is false in a build.
		const hls = new Hls({ debug: import.meta.env.DEV });
		hls.on(Hls.Events.ERROR, (_event, data) => {
			if (data.response?.code === 401) {
				onSessionLost();
			} else if (data.fatal) {
				setFailed(true);
			}
		});
		hls.loadSource(playlistUrl);
		hls.attachMedia(video);

		return () => hls.destroy();
	}, [playlistUrl, onSessionLost]);

	return (
		<>
			<video ref={videoRef} controls className="aspect-video w-full bg-black" />
			{failed ? <p role="alert">This title could not be played.</p> : null}
		</>
	);
};
