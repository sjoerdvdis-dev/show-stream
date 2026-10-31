import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover';
import { EllipsisVertical } from 'lucide-react';

export default function MoreOptionsPopover({ size }: { size: string }) {
	return (
		<Popover>
			<PopoverTrigger>
				<EllipsisVertical size={size} />
			</PopoverTrigger>
			<PopoverContent className="w-24 text-sm p-2 flex flex-col" align="center" side="top">
				<p>Options</p>
			</PopoverContent>
		</Popover>
	);
}
