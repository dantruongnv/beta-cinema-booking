import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { validateMovieInput } from "@/lib/validators";

export async function GET(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã phim không hợp lệ");

  const movie = await prisma.movie.findUnique({
    where: { id },
    include: { _count: { select: { showtimes: true } } },
  });
  if (!movie) {
    return Response.json({ message: "Không tìm thấy phim" }, { status: 404 });
  }
  return Response.json({ movie });
}

export async function PATCH(request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã phim không hợp lệ");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const { data, error } = validateMovieInput(body, { partial: true });
  if (error) return badRequest(error);
  if (Object.keys(data).length === 0) return badRequest("Không có dữ liệu cần cập nhật");

  const existing = await prisma.movie.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ message: "Không tìm thấy phim" }, { status: 404 });
  }

  // Không cho ẩn phim khi còn suất chiếu sắp tới
  if (data.isActive === false && existing.isActive) {
    const upcoming = await prisma.showtime.count({
      where: { movieId: id, status: "ACTIVE", startTime: { gt: new Date() } },
    });
    if (upcoming > 0) {
      return Response.json(
        { message: `Phim còn ${upcoming} suất chiếu sắp tới, hãy hủy các suất này trước khi ẩn phim` },
        { status: 409 }
      );
    }
  }

  const movie = await prisma.movie.update({
    where: { id },
    data,
    include: { _count: { select: { showtimes: true } } },
  });
  return Response.json({ movie });
}

export async function DELETE(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã phim không hợp lệ");

  const existing = await prisma.movie.findUnique({
    where: { id },
    include: { _count: { select: { showtimes: true } } },
  });
  if (!existing) {
    return Response.json({ message: "Không tìm thấy phim" }, { status: 404 });
  }

  // Phim đã từng có suất chiếu thì giữ lại để không mất lịch sử vé
  if (existing._count.showtimes > 0) {
    return Response.json(
      { message: "Phim đã có lịch chiếu nên không thể xóa, hãy chuyển sang trạng thái ẩn" },
      { status: 409 }
    );
  }

  await prisma.movie.delete({ where: { id } });
  return Response.json({ ok: true });
}