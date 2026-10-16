import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseId } from "@/lib/http";
import SeatMapManager from "@/components/staff/SeatMapManager";

export default async function StaffSeatsPage({ params }) {
  await requireStaffPage();

  const roomId = parseId((await params).id);
  if (!roomId) notFound();

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, name: true, cinema: { select: { id: true, name: true } } },
  });
  if (!room) notFound();

  return (
    <div>
      <Link href={`/staff/cinemas/${room.cinema.id}/rooms`} className="text-sm underline">
        ← Về danh sách phòng của {room.cinema.name}
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">Sơ đồ ghế - {room.name}</h1>
      <SeatMapManager roomId={room.id} />
    </div>
  );
}