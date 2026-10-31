'use client';

import { TranscodePlaylistAPIData, TranscodeRequestAPIData } from '@workspace/types/api-types';
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useFetchTranscodeRequest = () => {
	const fetchTranscodeRequest = async (id: number) => {
		const response = await fetch(`/api/transcode/request/${id}`);
		const { status } = (await response.json()) as TranscodeRequestAPIData;
		return status;
	};

	return useCallback(
		async (id: number, title?: string) => {
			const status = await fetchTranscodeRequest(id);

			if (status === 'not ready') {
				toast.error(`Playback preparation for ${title || String(id)} failed.`, { closeButton: true });
				return false;
			}
			if (status === 'in progress') {
				toast.success(`Playback for ${title || String(id)} is being prepared.`, { closeButton: true });
				return false;
			}

			return true;
		},
		[fetchTranscodeRequest],
	);
};

export const useFetchTranscodePlaylist = () => {
	const fetchTranscodePlaylist = async (id: number) => {
		const response = await fetch(`/api/transcode/playlist/${id}`);
		const { playlistUrl } = (await response.json()) as TranscodePlaylistAPIData;
		return playlistUrl;
	};

	return useCallback(
		async (id: number) => {
			const playlistUrl = await fetchTranscodePlaylist(id);
			return playlistUrl || null;
		},
		[fetchTranscodePlaylist],
	);
};
