import type { TranscodeStatus } from '@workspace/contract/api-types';
import { CircleAlert, CircleCheck, CircleDashed, LoaderCircle, Play, RotateCcw, type LucideIcon } from 'lucide-react';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { cn } from '@workspace/ui/lib/utils';

const statuses: Record<TranscodeStatus, { label: string; meaning: string; icon: LucideIcon; className: string }> = {
	'not ready': {
		label: 'Not ready',
		meaning: 'Not prepared yet. Play prepares it.',
		icon: CircleDashed,
		className: 'bg-info/15 text-info',
	},
	'in progress': {
		label: 'Preparing',
		meaning: 'Being prepared for playback.',
		icon: LoaderCircle,
		className: 'bg-warning/15 text-warning',
	},
	ready: {
		label: 'Ready',
		meaning: 'Ready to play.',
		icon: CircleCheck,
		className: 'bg-success/15 text-success',
	},
	failed: {
		label: 'Failed',
		meaning: 'Preparing it failed.',
		icon: CircleAlert,
		className: 'bg-destructive/15 text-destructive',
	},
};

type StatusBadgeProps = {
	/** A title with no status has never been prepared, so it reads as `not ready`. */
	status: TranscodeStatus | undefined;
	/** Why the transcode failed, when `status` is `failed`. */
	failureReason?: string;
	className?: string;
};

/**
 * A title's transcode status, with an icon, and a tooltip that says what it means. The reason for
 * a failure is also in the text that assistive technology reads.
 */
export const StatusBadge = ({ status = 'not ready', failureReason, className }: StatusBadgeProps) => {
	const { label, meaning, icon: Icon, className: statusClassName } = statuses[status];
	const detail = status === 'failed' && failureReason ? failureReason : meaning;
	const spinClassName = status === 'in progress' ? 'motion-safe:animate-spin' : undefined;

	return (
		<Tooltip>
			<TooltipTrigger render={<Badge className={cn(statusClassName, className)} />}>
				<Icon aria-hidden="true" data-icon="inline-start" className={spinClassName} />
				{label}
				<span className="sr-only">{detail}</span>
			</TooltipTrigger>
			<TooltipContent>
				<span aria-hidden="true">{detail}</span>
			</TooltipContent>
		</Tooltip>
	);
};

type PlayButtonProps = {
	/** The title's name, so that every button on a page has its own accessible name. */
	title: string;
	status: TranscodeStatus | undefined;
	onPlay: () => void;
	/** Offered on a failed title in place of Play. Without it, a failed title plays as any other. */
	onRetry?: () => void;
	disabled?: boolean;
	/** `icon` is a round button for a poster; `default` shows its label. */
	size?: 'default' | 'icon';
	className?: string;
};

/**
 * The one Play button. Play on a title that is not ready prepares it, as the API does. A title
 * being prepared cannot be played yet, and a failed one offers Retry when the screen does.
 */
export const PlayButton = ({
	title,
	status = 'not ready',
	onPlay,
	onRetry,
	disabled = false,
	size = 'default',
	className,
}: PlayButtonProps) => {
	const action =
		status === 'in progress'
			? { label: 'Preparing', icon: LoaderCircle, onClick: undefined }
			: status === 'failed' && onRetry
				? { label: 'Retry', icon: RotateCcw, onClick: onRetry }
				: { label: 'Play', icon: Play, onClick: onPlay };
	const Icon = action.icon;
	const preparing = status === 'in progress';

	return (
		<Button
			aria-label={`${action.label} ${title}`}
			disabled={disabled || preparing}
			onClick={action.onClick}
			variant={action.label === 'Retry' ? 'secondary' : 'default'}
			size={size === 'icon' ? 'icon-lg' : 'lg'}
			className={cn(size === 'icon' ? 'rounded-full' : 'px-4', className)}
		>
			<Icon
				aria-hidden="true"
				data-icon={size === 'icon' ? undefined : 'inline-start'}
				className={cn(preparing && 'motion-safe:animate-spin', action.icon === Play && 'fill-current')}
			/>
			{size === 'icon' ? null : action.label}
		</Button>
	);
};
