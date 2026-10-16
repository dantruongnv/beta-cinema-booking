import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { validateRoomInput } from "@/lib/validators";

export async function PATCH(request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã phòng không hợp lệ");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const { data, error } = validateRoomInput(body, { partial: true });
  if (error) return badRequest(error);
  if (Object.keys(data).length === 0) return badRequest("Không có dữ liệu cần cập nhật");

  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ message: "Không tìm thấy phòng" }, { status: 404 });
  }

  if (data.name) {
    const duplicate = await prisma.room.findFirst({
      where: {
        cinemaId: existing.cinemaId,
        id: { not: id },
        name: { equals: data.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (duplicate) {
      return Response.json({ message: "Tên phòng đã tồn tại trong rạp này" }, { status: 409 });
    }
  }

  // Không cho ẩn phòng khi còn suất chiếu sắp tới
  if (data.isActive === false && existing.isActive) {
    const upcoming = await prisma.showtime.count({
      where: { roomId: id, status: "ACTIVE", startTime: { gt: new Date() } },
    });
    if (upcoming > 0) {
      return Response.json(
        { message: `Phòng còn ${upcoming} suất chiếu sắp tới, hãy hủy các suất này trước khi ẩn phòng` },
        { status: 409 }
      );
    }
  }

  try {
    const room = await prisma.room.update({
      where: { id },
      data,
      include: { _count: { select: { seats: true, showtimes: true } } },
    });
    return Response.json({ room });
  } catch (err) {
    if (err.code === "P2002") {
      return Response.json({ message: "Tên phòng đã tồn tại trong rạp này" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã phòng không hợp lệ");

  const existing = await prisma.room.findUnique({
    where: { id },
    include: { _count: { select: { showtimes: true } } },
  });
  if (!existing) {
    return Response.json({ message: "Không tìm thấy phòng" }, { status: 404 });
  }

  // Phòng đã từng có suất chiếu (kể cả đã chiếu xong) thì giữ lại để không mất lịch sử vé
  if (existing._count.showtimes > 0) {
    return Response.json(
      { message: "Phòng đã có lịch chiếu nên không thể xóa, hãy chuyển sang trạng thái ẩn" },
      { status: 409 }
    );
  }

  // Xóa ghế rồi xóa phòng trong cùng một giao dịch
  await prisma.$transaction([
    prisma.seat.deleteMany({ where: { roomId: id } }),
    prisma.room.delete({ where: { id } }),
  ]);
  return Response.json({ ok: true });
}