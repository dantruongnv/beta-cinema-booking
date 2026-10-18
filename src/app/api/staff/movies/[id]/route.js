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

export async function DELETE(request, { params }) {
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

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  // Nếu phim có suất chiếu, kiểm tra xem đã có đơn đặt vé nào chưa
  if (existing._count.showtimes > 0) {
    const bookingsCount = await prisma.booking.count({
      where: { showtime: { movieId: id } },
    });

    if (bookingsCount > 0 && !force) {
      return Response.json(
        {
          message: `Phim đã có ${bookingsCount} đơn đặt vé. Bạn có thể vào mục "Vé & Đơn đặt" để hủy các đơn vé trước, hoặc chuyển phim sang trạng thái Ẩn.`,
          hasBookings: true,
          bookingsCount,
        },
        { status: 409 }
      );
    }

    // Nếu không có vé nào hoặc người dùng xác nhận xóa cưỡng bức (force=true)
    await prisma.$transaction(async (tx) => {
      const showtimes = await tx.showtime.findMany({ where: { movieId: id }, select: { id: true } });
      const showtimeIds = showtimes.map((s) => s.id);

      if (showtimeIds.length > 0) {
        const bookings = await tx.booking.findMany({
          where: { showtimeId: { in: showtimeIds } },
          select: { id: true },
        });
        const bookingIds = bookings.map((b) => b.id);

        if (bookingIds.length > 0) {
          await tx.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
          await tx.bookingSeat.deleteMany({ where: { bookingId: { in: bookingIds } } });
          await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });
        }

        await tx.bookingSeat.deleteMany({ where: { showtimeId: { in: showtimeIds } } });
        await tx.showtime.deleteMany({ where: { id: { in: showtimeIds } } });
      }

      await tx.movie.delete({ where: { id } });
    });

    return Response.json({ ok: true });
  }

  await prisma.movie.delete({ where: { id } });
  return Response.json({ ok: true });
}