'use client';

import { useParams } from 'next/navigation';

export default function SeasonPage() {
	const { id, season, episode } = useParams();

	return <div>{`Show: ${id} - Season: ${season} - Episode: ${episode}`}</div>;
}
