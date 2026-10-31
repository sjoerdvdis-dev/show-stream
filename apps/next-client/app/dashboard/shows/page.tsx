// Page showing the list of shows
import { Input } from '@workspace/ui/components/input';

export default function ShowsPage() {
	return (
		<div className="w-full max-h-full overflow-y-auto flex flex-col items-center px-16 py-8 gap-4">
			<h1 className="text-3xl w-full">Shows</h1>
			<div className="w-full min-h-fit">
				<Input />
			</div>
			<div className="flex w-full min-h-96 bg-accent"></div>
			<div className="flex w-full min-h-96 bg-accent"></div>
			<div className="flex w-full min-h-96 bg-accent"></div>
			<div className="flex w-full min-h-96 bg-accent"></div>
		</div>
	);
}
