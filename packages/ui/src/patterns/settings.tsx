import { LoaderCircle } from 'lucide-react';
import { useId, useState, type ReactElement, type ReactNode } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog';
import { Card, CardContent } from '@workspace/ui/components/card';
import { cn } from '@workspace/ui/lib/utils';

/** One group of settings, such as Playback, named by its title, with its controls in a card beside it or below it. */
export const SettingsSection = ({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description?: ReactNode;
	children: ReactNode;
	className?: string;
}) => {
	const titleId = useId();
	return (
		<section
			aria-labelledby={titleId}
			className={cn('grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-8', className)}
		>
			<div className="flex flex-col gap-1">
				<h2 id={titleId} className="text-base font-semibold">
					{title}
				</h2>
				{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
			</div>
			<Card>
				<CardContent className="flex flex-col gap-4">{children}</CardContent>
			</Card>
		</section>
	);
};

type ConfirmDialogProps = {
	/** The element that opens the dialog, such as `<Button variant="destructive">Delete</Button>`. */
	trigger: ReactElement;
	title: string;
	description?: ReactNode;
	confirmLabel?: string;
	/** Shows the confirm button in the destructive color, for an action that cannot be undone. */
	destructive?: boolean;
	/**
	 * Runs the action. While a returned promise is pending, the dialog stays open and confirm is busy. It closes when
	 * the promise resolves, and stays open when it rejects, so the screen can report the error.
	 */
	onConfirm: () => void | Promise<void>;
	className?: string;
};

/** Asks the user to confirm an action before it runs, such as deleting a user. */
export const ConfirmDialog = ({
	trigger,
	title,
	description,
	confirmLabel = 'Confirm',
	destructive = false,
	onConfirm,
	className,
}: ConfirmDialogProps) => {
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);

	const confirm = async () => {
		if (pending) return;
		setPending(true);
		try {
			await onConfirm();
			setOpen(false);
		} catch {
			// The screen reports the error from its own onConfirm. The dialog stays open to try again.
		} finally {
			setPending(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
			<AlertDialogTrigger render={trigger} />
			<AlertDialogContent className={className}>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					{description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant={destructive ? 'destructive' : 'default'}
						disabled={pending}
						focusableWhenDisabled
						aria-busy={pending || undefined}
						onClick={() => void confirm()}
					>
						{pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
