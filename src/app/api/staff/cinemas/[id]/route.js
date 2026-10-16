import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { validateCinemaInput } from "@/lib/validators";

export async function GET(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã rạp không hợp lệ");

  const cinema = await prisma.cinema.findUnique({
    where: { id },
    include: { _count: { select: { rooms: true } } },
  });
  if (!cinema) {
    return Response.json({ message: "Không tìm thấy rạp" }, { status: 404 });
  }
  return Response.json({ cinema });
}

export async function PATCH(request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã rạp không hợp lệ");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const { data, error } = validateCinemaInput(body, { partial: true });
  if (error) return badRequest(error);
  if (Object.keys(data).length === 0) return badRequest("Không có dữ liệu cần cập nhật");

  const existing = await prisma.cinema.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ message: "Không tìm thấy rạp" }, { status: 404 });
  }

  if (data.name) {
    const duplicate = await prisma.cinema.findFirst({
      where: { id: { not: id }, name: { equals: data.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) {
      return Response.json({ message: "Tên rạp đã tồn tại" }, { status: 409 });
    }
  }

  // Không cho ẩn rạp khi còn suất chiếu sắp tới
  if (data.isActive === false && existing.isActive) {
    const upcoming = await prisma.showtime.count({
      where: {
        room: { cinemaId: id },
        status: "ACTIVE",
        startTime: { gt: new Date() },
      },
    });
    if (upcoming > 0) {
      return Response.json(
        { message: `Rạp còn ${upcoming} suất chiếu sắp tới, hãy hủy các suất này trước khi ẩn rạp` },
        { status: 409 }
      );
    }
  }

  const cinema = await prisma.cinema.update({ where: { id }, data });
  return Response.json({ cinema });
}

export async function DELETE(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã rạp không hợp lệ");

  const existing = await prisma.cinema.findUnique({
    where: { id },
    include: { _count: { select: { rooms: true } } },
  });
  if (!existing) {
    return Response.json({ message: "Không tìm thấy rạp" }, { status: 404 });
  }

  // Rạp đã có phòng chiếu thì chỉ cho ẩn, không xóa hẳn
  if (existing._count.rooms > 0) {
    return Response.json(
      { message: "Rạp đã có phòng chiếu nên không thể xóa, hãy chuyển sang trạng thái ẩn" },
      { status: 409 }
    );
  }

  await prisma.cinema.delete({ where: { id } });
  return Response.json({ ok: true });
}