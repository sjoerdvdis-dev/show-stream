import { LoaderCircleIcon } from 'lucide-react';

export default function LoadingCircle({ size }: { size: string }) {
	return (
		<div className="">
			<LoaderCircleIcon size={size} className="animate-spin text-primary" />
		</div>
	);
}
