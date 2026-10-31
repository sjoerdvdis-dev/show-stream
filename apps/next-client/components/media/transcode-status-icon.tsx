import { AsteriskIcon, CheckIcon, LoaderCircle, XIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
import type { TranscodeStatus } from '@workspace/types/db-types';

export default function TranscodeStatusIcon({
	transcodeStatus,
	size,
	offset,
}: {
	transcodeStatus: TranscodeStatus;
	size: string;
	offset?: number;
}) {
	const tooltips = {
		'not ready': `Not ready for playback`,
		ready: 'Ready for playback',
		'in progress': 'Preparing for playback',
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger>{getTranscodeStatusIcon(transcodeStatus, size)}</TooltipTrigger>
				<TooltipContent side="top" sideOffset={offset}>
					{tooltips[transcodeStatus]}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export function getTranscodeStatusIcon(transcodeStatus: TranscodeStatus | 'all', size: string = '16') {
	if (transcodeStatus === 'all') {
		return <AsteriskIcon className="text-gray-500" size={size} />;
	}

	return {
		'not ready': <XIcon className="text-red-500" size={size} />,
		ready: <CheckIcon className="text-green-500" size={size} />,
		'in progress': <LoaderCircle className="animate-spin text-yellow-500" size={size} />,
	}[transcodeStatus];
}
