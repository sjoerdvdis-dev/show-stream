'use client';

import { useParams } from 'next/navigation';

export default function SeasonPage() {
	const { id, season } = useParams();

	return <div>{`Show: ${id} - Season: ${season}`}</div>;
}
