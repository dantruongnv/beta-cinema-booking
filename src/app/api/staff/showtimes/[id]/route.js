import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { parseVnDateTime } from "@/lib/datetime";
import { SHOWTIME_INCLUDE, parsePrice, priceErrorMessage, checkSchedule } from "@/lib/showtimeRules";

export async function PATCH(request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã suất chiếu không hợp lệ");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const existing = await prisma.showtime.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ message: "Không tìm thấy suất chiếu" }, { status: 404 });
  }
  if (existing.startTime.getTime() <= Date.now()) {
    return Response.json(
      { message: "Suất chiếu đã bắt đầu hoặc đã kết thúc nên không thể sửa" },
      { status: 409 }
    );
  }

  let movieId = existing.movieId;
  let roomId = existing.roomId;
  let startTime = existing.startTime;
  let scheduleChanged = false;
  const data = {};

  if (body.movieId !== undefined) {
    const value = parseId(body.movieId);
    if (!value) return badRequest("Hãy chọn phim");
    if (value !== movieId) {
      movieId = value;
      scheduleChanged = true;
    }
  }
  if (body.roomId !== undefined) {
    const value = parseId(body.roomId);
    if (!value) return badRequest("Hãy chọn phòng chiếu");
    if (value !== roomId) {
      roomId = value;
      scheduleChanged = true;
    }
  }
  if (body.startTime !== undefined) {
    const value = parseVnDateTime(body.startTime);
    if (!value) return badRequest("Giờ chiếu không hợp lệ");
    if (value.getTime() !== startTime.getTime()) {
      startTime = value;
      scheduleChanged = true;
    }
  }
  if (body.price !== undefined) {
    const value = parsePrice(body.price);
    if (value === null) return badRequest(priceErrorMessage());
    if (value !== existing.price) data.price = value;
  }
  if (body.status !== undefined) {
    if (!["ACTIVE", "CANCELLED"].includes(body.status)) return badRequest("Trạng thái không hợp lệ");
    if (body.status !== existing.status) data.status = body.status;
  }

  if (!scheduleChanged && Object.keys(data).length === 0) {
    return badRequest("Không có thay đổi nào");
  }

  const finalStatus = data.status ?? existing.status;
  if (finalStatus === "CANCELLED" && scheduleChanged) {
    return badRequest("Suất chiếu đã hủy: hãy kích hoạt lại trước khi đổi phim, phòng hoặc giờ");
  }

  // Suất đã có vé đặt chỉ được đổi giá
  if (scheduleChanged || data.status === "CANCELLED") {
    const activeBookings = await prisma.booking.count({
      where: { showtimeId: id, status: { in: ["PENDING", "PAID"] } },
    });
    if (activeBookings > 0) {
      return Response.json(
        { message: `Suất chiếu đã có ${activeBookings} đơn đặt vé nên chỉ được đổi giá vé` },
        { status: 409 }
      );
    }
  }

  // Kiểm tra lại lịch khi đổi phim/phòng/giờ hoặc kích hoạt lại suất đã hủy
  if (finalStatus === "ACTIVE" && (scheduleChanged || data.status === "ACTIVE")) {
    const check = await checkSchedule({ movieId, roomId, startTime, excludeId: id });
    if (check.error) {
      return Response.json({ message: check.error.message }, { status: check.error.status });
    }
    Object.assign(data, { movieId, roomId, startTime, endTime: check.endTime });
  }

  const showtime = await prisma.showtime.update({ where: { id }, data, include: SHOWTIME_INCLUDE });
  return Response.json({ showtime });
}

export async function DELETE(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const id = parseId((await params).id);
  if (!id) return badRequest("Mã suất chiếu không hợp lệ");

  const existing = await prisma.showtime.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return Response.json({ message: "Không tìm thấy suất chiếu" }, { status: 404 });
  }

  const bookings = await prisma.booking.count({ where: { showtimeId: id } });
  if (bookings > 0) {
    return Response.json(
      { message: "Suất chiếu đã có đơn đặt vé nên không thể xóa, hãy hủy suất chiếu thay vì xóa" },
      { status: 409 }
    );
  }

  await prisma.showtime.delete({ where: { id } });
  return Response.json({ ok: true });
}