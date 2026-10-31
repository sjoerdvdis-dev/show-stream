'use client';

import { useParams } from "next/navigation";

export default function ShowPage() {
  const { id } = useParams();

  return (
    <div>{`Show: ${id}`}</div>
  )
}