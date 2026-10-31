'use client';

import { cn } from '@workspace/ui/lib/utils';
import { MoveLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Backward({ size = 40, className }: { size?: number, className?: string }) {
	const router = useRouter();
	return <MoveLeft size={size} className={cn("absolute hover:cursor-pointer text-white", className)} onClick={() => router.back()} />;
}
