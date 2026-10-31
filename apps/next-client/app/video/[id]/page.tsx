'use client';

import Backward from '@/components/dashboard/backward';
import HLSPlayer from '@/components/hls-player';
import { useFetchTranscodePlaylist } from '@/hooks/use-video-api';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VideoPage() {
	const { id } = useParams();
	const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
	const transcodePlaylist = useFetchTranscodePlaylist();

	useEffect(() => {
		const getPlaylistUrl = async () => {
			const playlistUrl = await transcodePlaylist(Number(id));
			setPlaylistUrl(playlistUrl);
		};
		getPlaylistUrl();
	}, [id]);

	return (
		<div className="relative flex items-center justify-center h-screen">
			<Backward className='top-6 left-12 z-10' />
			<HLSPlayer playlistUrl={playlistUrl} />
		</div>
	);
}
