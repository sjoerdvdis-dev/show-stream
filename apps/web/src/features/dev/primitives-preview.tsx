import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Film, Home, MoreHorizontal, Search, Settings, Tv } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar';
import { Badge } from '@workspace/ui/components/badge';
import { Button } from '@workspace/ui/components/button';
import { Calendar } from '@workspace/ui/components/calendar';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@workspace/ui/components/card';
import { Checkbox } from '@workspace/ui/components/checkbox';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@workspace/ui/components/command';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@workspace/ui/components/dialog';
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '@workspace/ui/components/drawer';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { DualRangeSlider } from '@workspace/ui/components/dual-range-slider';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@workspace/ui/components/field';
import { Input } from '@workspace/ui/components/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@workspace/ui/components/input-group';
import { Label } from '@workspace/ui/components/label';
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@workspace/ui/components/popover';
import { Progress } from '@workspace/ui/components/progress';
import { RadioGroup, RadioGroupItem } from '@workspace/ui/components/radio-group';
import { ScrollArea } from '@workspace/ui/components/scroll-area';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@workspace/ui/components/select';
import { Separator } from '@workspace/ui/components/separator';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@workspace/ui/components/sheet';
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from '@workspace/ui/components/sidebar';
import { Skeleton } from '@workspace/ui/components/skeleton';
import { Slider } from '@workspace/ui/components/slider';
import { Switch } from '@workspace/ui/components/switch';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ui/components/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@workspace/ui/components/tabs';
import { Textarea } from '@workspace/ui/components/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@workspace/ui/components/tooltip';
import { ThemeSwitch } from './theme-switch';

/**
 * Every primitive from `@workspace/ui`, in its main states, for checking a change at a glance in
 * both themes. Dev only: the route at `/dev/primitives` uses this only under `pnpm dev`, so a build
 * leaves it out. Keep this module free of top-level side effects, or the build keeps them.
 * Phase 2 item 4 folds it into `/dev/components`.
 */

const sorts = [
	{ label: 'Title', value: 'title' },
	{ label: 'Release date', value: 'release' },
	{ label: 'Runtime', value: 'runtime' },
	{ label: 'Rating', value: 'rating' },
];

const genres = ['Action', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Horror', 'Science Fiction'];

const files = [
	{ name: 'The Dark Knight (2008).mkv', codec: 'H.265', size: '14.2 GB', status: 'Ready' },
	{ name: 'Heat (1995).mp4', codec: 'H.264', size: '8.7 GB', status: 'Transcoding' },
	{ name: 'Alien (1979).avi', codec: 'MPEG-4', size: '1.4 GB', status: 'Failed' },
];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
	<section className="flex flex-col gap-4" aria-label={title}>
		<h2 className="text-xl font-semibold">{title}</h2>
		{children}
	</section>
);

const Row = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-center gap-3">{children}</div>;

const Buttons = () => (
	<div className="flex flex-col gap-3">
		<Row>
			<Button>Play</Button>
			<Button variant="secondary">Add to list</Button>
			<Button variant="outline">Details</Button>
			<Button variant="ghost">Cancel</Button>
			<Button variant="destructive">Delete</Button>
			<Button variant="link">A link</Button>
			<Button disabled>Disabled</Button>
		</Row>
		<Row>
			<Button size="xs">Extra small</Button>
			<Button size="sm">Small</Button>
			<Button size="lg">Large</Button>
			<Button size="icon" aria-label="Search">
				<Search />
			</Button>
			<Button size="icon-sm" variant="outline" aria-label="More options">
				<MoreHorizontal />
			</Button>
		</Row>
		<Row>
			<Badge>New</Badge>
			<Badge variant="secondary">4K</Badge>
			<Badge variant="outline">H.265</Badge>
			<Badge variant="destructive">Failed</Badge>
		</Row>
	</div>
);

const Fields = () => (
	<FieldGroup className="max-w-sm">
		<Field>
			<FieldLabel htmlFor="primitives-search">Search the library</FieldLabel>
			<Input id="primitives-search" placeholder="Title or year" />
			<FieldDescription>Searches titles and years.</FieldDescription>
		</Field>
		<Field data-invalid>
			<FieldLabel htmlFor="primitives-username">Username</FieldLabel>
			<Input id="primitives-username" aria-invalid defaultValue="a" />
			<FieldError>A username has at least 3 characters.</FieldError>
		</Field>
		<Field>
			<FieldLabel htmlFor="primitives-disabled">Disabled</FieldLabel>
			<Input id="primitives-disabled" disabled defaultValue="Read only" />
		</Field>
		<Field>
			<FieldLabel htmlFor="primitives-path">Media folder</FieldLabel>
			<InputGroup>
				<InputGroupAddon>
					<Film />
				</InputGroupAddon>
				<InputGroupInput id="primitives-path" defaultValue="/media/movies" />
			</InputGroup>
		</Field>
		<Field>
			<FieldLabel htmlFor="primitives-notes">Notes</FieldLabel>
			<Textarea id="primitives-notes" placeholder="Anything to remember about this file" />
		</Field>
	</FieldGroup>
);

const Choices = () => {
	const [runtime, setRuntime] = useState([60, 150]);
	return (
		<div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
			<div className="flex flex-col gap-4">
				<Label>
					<Switch defaultChecked />
					Autoplay the next episode
				</Label>
				<Label>
					<Switch disabled />
					Hardware acceleration (unavailable)
				</Label>
				<Label>
					<Checkbox defaultChecked />
					Include unmatched files
				</Label>
				<Label>
					<Checkbox />
					Show hidden titles
				</Label>
			</div>
			<RadioGroup aria-label="Playback status" defaultValue="all">
				{['all', 'ready', 'not ready', 'failed'].map((status) => (
					<Label key={status} className="capitalize">
						<RadioGroupItem value={status} />
						{status}
					</Label>
				))}
			</RadioGroup>
			<div className="flex flex-col gap-3">
				<Label id="primitives-volume">Volume</Label>
				<Slider aria-labelledby="primitives-volume" defaultValue={[60]} />
			</div>
			<div className="flex flex-col gap-3 pt-6">
				<DualRangeSlider
					aria-label="Runtime"
					min={0}
					max={240}
					step={5}
					value={runtime}
					onValueChange={(value) => setRuntime(value as number[])}
					label={(minutes) => `${minutes} min`}
				/>
			</div>
		</div>
	);
};

const Overlays = () => (
	<Row>
		<Dialog>
			<DialogTrigger render={<Button variant="outline" />}>Dialog</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Rename the movie</DialogTitle>
					<DialogDescription>The file on disk keeps its name.</DialogDescription>
				</DialogHeader>
				<Input aria-label="Title" defaultValue="The Dark Knight" />
				<DialogFooter>
					<DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
					<DialogClose render={<Button />}>Save</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
		<AlertDialog>
			<AlertDialogTrigger render={<Button variant="destructive" />}>Alert dialog</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Remove the movie?</AlertDialogTitle>
					<AlertDialogDescription>The file stays on disk, and a rescan brings it back.</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive">Remove</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
		<Sheet>
			<SheetTrigger render={<Button variant="outline" />}>Sheet</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>Filters</SheetTitle>
					<SheetDescription>2 active filters</SheetDescription>
				</SheetHeader>
				<div className="px-4">
					<Label>
						<Checkbox defaultChecked />
						Ready to play
					</Label>
				</div>
				<SheetFooter>
					<Button>Apply</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
		<Drawer>
			<DrawerTrigger render={<Button variant="outline" />}>Drawer</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Playback</DrawerTitle>
					<DrawerDescription>Swipe down or press Escape to close.</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter>
					<Button>Resume from 01:52:07</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
		<Popover>
			<PopoverTrigger render={<Button variant="outline" />}>Popover</PopoverTrigger>
			<PopoverContent>
				<PopoverHeader>
					<PopoverTitle>The Dark Knight</PopoverTitle>
					<PopoverDescription>2008 · 2h 32m · Action, Crime</PopoverDescription>
				</PopoverHeader>
			</PopoverContent>
		</Popover>
		<Tooltip>
			<TooltipTrigger render={<Button variant="outline" />}>Tooltip</TooltipTrigger>
			<TooltipContent>Transcoding failed. Retry from the detail page</TooltipContent>
		</Tooltip>
		<Button variant="outline" onClick={() => toast.success('The library scan finished', { description: '12 new movies' })}>
			Toast
		</Button>
	</Row>
);

const Menus = () => {
	const [subtitles, setSubtitles] = useState(true);
	return (
		<div className="flex flex-col gap-4">
			<Row>
				<DropdownMenu>
					<DropdownMenuTrigger render={<Button variant="outline" />}>Dropdown menu</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuGroup>
							<DropdownMenuLabel>The Dark Knight</DropdownMenuLabel>
							<DropdownMenuItem>Play</DropdownMenuItem>
							<DropdownMenuItem>Rescan</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuCheckboxItem checked={subtitles} onCheckedChange={setSubtitles}>
							Subtitles
						</DropdownMenuCheckboxItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<Select items={sorts} defaultValue="title">
					<SelectTrigger aria-label="Sort by" className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							{sorts.map((sort) => (
								<SelectItem key={sort.value} value={sort.value}>
									{sort.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</Row>
			<Command className="max-w-sm rounded-lg border">
				<CommandInput placeholder="Search genres..." />
				<CommandList>
					<CommandEmpty>No genres found.</CommandEmpty>
					<CommandGroup heading="Genres">
						{genres.map((genre) => (
							<CommandItem key={genre} value={genre}>
								{genre}
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</Command>
		</div>
	);
};

const Dates = () => {
	const [date, setDate] = useState<Date | undefined>(() => new Date(2008, 6, 18));
	return (
		<Calendar
			mode="single"
			selected={date}
			onSelect={setDate}
			defaultMonth={new Date(2008, 6)}
			captionLayout="dropdown"
			className="w-fit rounded-lg border"
		/>
	);
};

const Display = () => (
	<div className="flex flex-col gap-6">
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Library</CardTitle>
					<CardDescription>Last scanned 2 minutes ago</CardDescription>
					<CardAction>
						<Badge variant="secondary">128 movies</Badge>
					</CardAction>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					<Progress value={64} aria-label="Scan progress" />
					<p className="text-sm text-muted-foreground">Scanning 82 of 128</p>
				</CardContent>
				<CardFooter>
					<Button size="sm">Scan library</Button>
				</CardFooter>
			</Card>
			<Card>
				<CardHeader>
					<CardTitle>Loading</CardTitle>
					<CardDescription>Skeletons hold the place of content.</CardDescription>
				</CardHeader>
				<CardContent className="flex gap-4">
					<Skeleton className="aspect-[2/3] w-20 rounded-lg" />
					<div className="flex flex-1 flex-col gap-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				</CardContent>
			</Card>
		</div>
		<Row>
			<Avatar>
				<AvatarFallback>SV</AvatarFallback>
			</Avatar>
			<Avatar size="sm">
				<AvatarFallback>OW</AvatarFallback>
			</Avatar>
			<Separator orientation="vertical" className="h-8" />
			<span className="text-sm text-muted-foreground">Avatars, and a vertical separator</span>
		</Row>
		<Table>
			<TableCaption>Files in the library</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>File</TableHead>
					<TableHead>Codec</TableHead>
					<TableHead className="text-right">Size</TableHead>
					<TableHead>Status</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{files.map((file) => (
					<TableRow key={file.name}>
						<TableCell className="font-mono">{file.name}</TableCell>
						<TableCell className="font-mono">{file.codec}</TableCell>
						<TableCell className="text-right font-mono tabular-nums">{file.size}</TableCell>
						<TableCell>
							<Badge variant={file.status === 'Failed' ? 'destructive' : 'outline'}>{file.status}</Badge>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
		<ScrollArea className="h-40 max-w-sm rounded-lg border">
			<ul className="flex flex-col gap-2 p-4 text-sm">
				{Array.from({ length: 20 }, (_, index) => `Episode ${index + 1}`).map((episode) => (
					<li key={episode}>{episode}</li>
				))}
			</ul>
		</ScrollArea>
	</div>
);

const Navigation = () => (
	<div className="flex flex-col gap-6">
		<Tabs defaultValue="overview" className="max-w-md">
			<TabsList>
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="cast">Cast</TabsTrigger>
				<TabsTrigger value="files">Files</TabsTrigger>
			</TabsList>
			<TabsContent value="overview" className="text-sm">
				Batman faces the Joker in Gotham.
			</TabsContent>
			<TabsContent value="cast" className="text-sm">
				Christian Bale, Heath Ledger
			</TabsContent>
			<TabsContent value="files" className="text-sm">
				One file, 14.2 GB
			</TabsContent>
		</Tabs>
		<Tabs defaultValue="all">
			<TabsList variant="line">
				<TabsTrigger value="all">All</TabsTrigger>
				<TabsTrigger value="unwatched">Unwatched</TabsTrigger>
			</TabsList>
		</Tabs>
		{/* collapsible="none" keeps the sidebar inside this box, where the app's fills the screen. */}
		<SidebarProvider className="min-h-0 w-fit overflow-hidden rounded-lg border">
			<Sidebar collapsible="none">
				<SidebarHeader className="px-4 font-semibold">ShowStream</SidebarHeader>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupLabel>Main</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton isActive>
										<Home />
										<span>Home</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<Search />
										<span>Search</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
					<SidebarGroup>
						<SidebarGroupLabel>Media</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<Film />
										<span>Movies</span>
									</SidebarMenuButton>
									<SidebarMenuBadge>128</SidebarMenuBadge>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<Tv />
										<span>Shows</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton>
										<Settings />
										<span>Settings</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>
		</SidebarProvider>
	</div>
);

export const PrimitivesPreview = () => (
	<TooltipProvider>
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-8">
			<header className="flex flex-col gap-4">
				<h1 className="text-3xl font-semibold tracking-tight">Primitives</h1>
				<p className="max-w-prose text-muted-foreground">
					Every primitive in <code className="font-mono text-sm">@workspace/ui</code>, in the theme chosen here. Only{' '}
					<code className="font-mono text-sm">pnpm dev</code> serves this page.
				</p>
				<ThemeSwitch />
			</header>
			<Section title="Buttons and badges">
				<Buttons />
			</Section>
			<Section title="Fields">
				<Fields />
			</Section>
			<Section title="Switches, checkboxes, radios and sliders">
				<Choices />
			</Section>
			<Section title="Dialogs, sheets, popovers, tooltips and toasts">
				<Overlays />
			</Section>
			<Section title="Menus, select and command">
				<Menus />
			</Section>
			<Section title="Calendar">
				<Dates />
			</Section>
			<Section title="Cards, progress, skeletons, avatars, table and scroll area">
				<Display />
			</Section>
			<Section title="Tabs and sidebar">
				<Navigation />
			</Section>
		</main>
	</TooltipProvider>
);
