import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { validateRoomInput } from "@/lib/validators";
import { buildSeatLayout } from "@/lib/seatLayout";

export async function GET(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const cinemaId = parseId((await params).id);
  if (!cinemaId) return badRequest("Mã rạp không hợp lệ");

  const rooms = await prisma.room.findMany({
    where: { cinemaId },
    orderBy: { id: "asc" },
    include: { _count: { select: { seats: true, showtimes: true } } },
  });
  return Response.json({ rooms });
}

export async function POST(request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const cinemaId = parseId((await params).id);
  if (!cinemaId) return badRequest("Mã rạp không hợp lệ");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const { data, error } = validateRoomInput(body);
  if (error) return badRequest(error);

  const cinema = await prisma.cinema.findUnique({ where: { id: cinemaId }, select: { id: true } });
  if (!cinema) {
    return Response.json({ message: "Không tìm thấy rạp" }, { status: 404 });
  }

  const duplicate = await prisma.room.findFirst({
    where: { cinemaId, name: { equals: data.name, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    return Response.json({ message: "Tên phòng đã tồn tại trong rạp này" }, { status: 409 });
  }

  try {
    // Tạo phòng và toàn bộ ghế trong cùng một thao tác (hoặc thành công hết, hoặc không tạo gì)
    const room = await prisma.room.create({
      data: {
        name: data.name,
        cinemaId,
        seats: { create: buildSeatLayout(data.rows, data.seatsPerRow, data.vipRows) },
      },
      include: { _count: { select: { seats: true, showtimes: true } } },
    });
    return Response.json({ room }, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return Response.json({ message: "Tên phòng đã tồn tại trong rạp này" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}