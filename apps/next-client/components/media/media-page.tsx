export function MediaPageContainer({ children }: { children?: React.ReactNode }) {
	return (
		<div className="w-full max-h-full overflow-y-auto flex flex-col items-center px-4 md:px-16 xl:px-24 py-8 gap-4">
			{children}
		</div>
	);
}

export function MediaPageHeader({ header }: { header: string }) {
	return <h1 className="text-3xl w-full">{header}</h1>;
}

export function MediaPageBrowseBar({ search, sort, filter }: { search: React.ReactNode; sort: React.ReactNode; filter: React.ReactNode }) {
	return (
		<div className="w-full min-h-fit flex gap-2">
			{search}
			{sort}
			{filter}
		</div>
	);
}
