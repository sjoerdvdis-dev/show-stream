'use client';

import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PlayIcon } from 'lucide-react';
import { useFetchTranscodeRequest } from '@/hooks/use-video-api';
import MoreOptionsPopover from '@/components/media/more-options-popover';
import TranscodeStatusIcon from '@/components/media/transcode-status-icon';
import { Card, CardContent, CardFooter } from '@workspace/ui/components/card';
import type { MediaType, TranscodeStatus } from '@workspace/types/db-types';

export default function MediaCard(props: {
	id: number;
	title?: string;
	poster_path?: string;
	release_date?: string;
	transcodeStatus: TranscodeStatus;
	mediaType: MediaType;
}) {
	const { id, title, poster_path, release_date, transcodeStatus, mediaType } = props;

	return (
		<Card className="p-0 rounded-sm overflow-clip gap-0 select-none w-full max-w-56">
			<CardContent className="max-h-64 p-0">
				<div className="relative w-full h-full">
					<Image
						src={`${process.env.NEXT_PUBLIC_MOVIE_DB_IMAGE_BASE_URL}/w200/${poster_path}`}
						alt={`${title} poster`}
						width={200}
						height={300}
						className="w-full max-h-full object-cover"
						loading="lazy"
						priority={false}
					/>
					<div className="absolute flex flex-col inset-0 w-full h-full bg-neutral-950/25 transition-opacity opacity-0 hover:opacity-100 text-white">
						<div className="flex justify-center items-center h-full">
							<PlayButton id={id} title={title} transcodeStatus={transcodeStatus} />
						</div>
						<div className="flex justify-end p-2 gap-2">
							<TranscodeStatusIcon transcodeStatus={transcodeStatus} size="24" offset={0} />
							<MoreOptionsPopover size="24" />
						</div>
					</div>
				</div>
			</CardContent>
			<CardFooter className="p-2 border-t-0">
				<div className="flex flex-col text-center w-full">
					<Link href={`/dashboard/${mediaType}s/${id}`} className="w-full h-full">
						<h2 className="text-base whitespace-nowrap truncate max-w-full hover:underline">{title}</h2>
					</Link>
					<p className="text-sm">{release_date?.split('-')[0]}</p>
				</div>
			</CardFooter>
		</Card>
	);
}

function PlayButton({ id, title, transcodeStatus }: { id: number; title?: string; transcodeStatus: TranscodeStatus }) {
	const ready = transcodeStatus === 'ready';
	const icon = <PlayIcon className="fill-current" />;
	const transcodeRequest = useFetchTranscodeRequest();

	if (ready) {
		return (
			<Link
				className="p-4 bg-neutral-950/75 rounded-full transform transition-transform duration-200 hover:scale-125"
				href={`/video/${id}`}
			>
				{icon}
			</Link>
		);
	}

	return (
		<div
			className="p-4 bg-neutral-950/75 rounded-full transform transition-transform duration-200 hover:scale-125 cursor-pointer"
			onClick={async () => {
				const ready = await transcodeRequest(id, title);
				if (!ready) return;
				redirect(`/video/${id}`);
			}}
		>
			{icon}
		</div>
	);
}
