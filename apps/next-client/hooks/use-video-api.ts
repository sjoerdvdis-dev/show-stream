'use client';

import type { TranscodePlaylistAPIData, TranscodeRequestAPIData } from '@workspace/contract/api-types';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { api, fetchWithSession, isSessionEnded, returnToLogin } from '@/lib/api';

export const useRetryTranscode = () =>
	useCallback(async (id: number, title?: string) => {
		try {
			await api.transcodeRetry({ params: { id } });
			toast.success(`Playback for ${title || String(id)} is being prepared.`, { closeButton: true });
		} catch (error) {
			if (isSessionEnded(error)) {
				returnToLogin();
				return;
			}
			toast.error(`Playback preparation for ${title || String(id)} could not be retried.`, { closeButton: true });
		}
	}, []);

export const useFetchTranscodeRequest = () => {
	const retryTranscode = useRetryTranscode();

	const fetchTranscodeRequest = async (id: number): Promise<TranscodeRequestAPIData> => {
		const response = await fetchWithSession(`/api/transcode/request/${id}`);
		if (!response.ok) {
			return { status: 'not ready' };
		}
		return (await response.json()) as TranscodeRequestAPIData;
	};

	return useCallback(
		async (id: number, title?: string) => {
			const { status, error } = await fetchTranscodeRequest(id);

			if (status === 'failed') {
				toast.error(`Playback preparation for ${title || String(id)} failed.`, {
					description: error,
					closeButton: true,
					action: { label: 'Retry', onClick: () => retryTranscode(id, title) },
				});
				return false;
			}
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
		[fetchTranscodeRequest, retryTranscode],
	);
};

export const useFetchTranscodePlaylist = () => {
	const fetchTranscodePlaylist = async (id: number) => {
		const response = await fetchWithSession(`/api/transcode/playlist/${id}`);
		if (!response.ok) {
			return null;
		}
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
