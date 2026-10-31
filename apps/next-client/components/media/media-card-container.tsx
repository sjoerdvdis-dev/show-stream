export default function MediaCardContainer({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={`
        grid gap-3 w-full 
        grid-cols-[repeat(auto-fill,minmax(100px,1fr))] 
        md:grid-cols-[repeat(auto-fill,minmax(125px,1fr))] 
				lg:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]
        xl:grid-cols-[repeat(auto-fill,minmax(175px,1fr))]
      `}
		>
			{children}
		</div>
	);
}
