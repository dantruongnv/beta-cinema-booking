import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseId } from "@/lib/http";
import RoomManager from "@/components/staff/RoomManager";

export default async function StaffRoomsPage({ params }) {
  await requireStaffPage();

  const cinemaId = parseId((await params).id);
  if (!cinemaId) notFound();

  const cinema = await prisma.cinema.findUnique({
    where: { id: cinemaId },
    select: { id: true, name: true },
  });
  if (!cinema) notFound();

  return (
    <div>
      <Link href="/staff/cinemas" className="text-sm underline">← Về danh sách rạp</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">Phòng chiếu - {cinema.name}</h1>
      <RoomManager cinemaId={cinema.id} />
    </div>
  );
}