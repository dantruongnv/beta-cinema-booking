import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { PUBLIC_SHOWTIME_WHERE } from "@/lib/schedule";
import { seatPrice } from "@/lib/pricing";
import { generateBookingCode } from "@/lib/bookingCode";
import { releaseExpiredBookings } from "@/lib/bookings";
import { HOLD_MINUTES, MAX_SEATS_PER_BOOKING } from "@/lib/constants";

export async function POST(request) {
  const { user, error: authError } = await requireUser();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const showtimeId = parseId(body.showtimeId);
  if (!showtimeId) return badRequest("Suất chiếu không hợp lệ");

  const seatIds = Array.isArray(body.seatIds) ? [...new Set(body.seatIds.map(Number))] : [];
  if (seatIds.length === 0 || seatIds.some((n) => !Number.isInteger(n) || n <= 0)) {
    return badRequest("Hãy chọn ít nhất một ghế");
  }
  if (seatIds.length > MAX_SEATS_PER_BOOKING) {
    return badRequest(`Mỗi đơn tối đa ${MAX_SEATS_PER_BOOKING} ghế`);
  }

  await releaseExpiredBookings();

  // Suất phải đang mở bán: đang hoạt động, chưa bắt đầu, phòng/rạp/phim đang hiện
  const showtime = await prisma.showtime.findFirst({
    where: { id: showtimeId, ...PUBLIC_SHOWTIME_WHERE, startTime: { gt: new Date() } },
    select: { id: true, price: true, roomId: true },
  });
  if (!showtime) {
    return Response.json({ message: "Suất chiếu không tồn tại hoặc đã đóng bán vé" }, { status: 404 });
  }

  const seats = await prisma.seat.findMany({
    where: { id: { in: seatIds }, roomId: showtime.roomId, isActive: true },
  });
  if (seats.length !== seatIds.length) {
    return badRequest("Có ghế không hợp lệ hoặc đã bị vô hiệu hóa");
  }

  const seatRows = seats.map((s) => ({
    seatId: s.id,
    showtimeId: showtime.id,
    price: seatPrice(showtime.price, s.type),
  }));
  const totalAmount = seatRows.reduce((sum, row) => sum + row.price, 0);
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const booking = await prisma.$transaction(async (tx) => {
        // Thay thế đơn đang giữ ghế cũ của chính người này ở suất này
        const old = await tx.booking.findMany({
          where: { userId: user.id, showtimeId, status: "PENDING" },
          select: { id: true },
        });
        if (old.length > 0) {
          const oldIds = old.map((b) => b.id);
          await tx.bookingSeat.deleteMany({ where: { bookingId: { in: oldIds } } });
          await tx.booking.updateMany({ where: { id: { in: oldIds } }, data: { status: "CANCELLED" } });
        }

        return tx.booking.create({
          data: {
            code: generateBookingCode(),
            totalAmount,
            expiresAt,
            userId: user.id,
            showtimeId,
            seats: { create: seatRows },
          },
          select: { code: true, expiresAt: true },
        });
      });
      return Response.json({ booking }, { status: 201 });
    } catch (err) {
      if (err.code === "P2002") {
        // Trùng mã đơn (hiếm): thử lại với mã mới
        if (String(err.meta?.target).includes("code")) continue;
        // Trùng ghế: người khác vừa giữ trước
        return Response.json(
          { message: "Một hoặc nhiều ghế vừa được người khác đặt, vui lòng chọn lại" },
          { status: 409 }
        );
      }
      console.error(err);
      return Response.json({ message: "Lỗi máy chủ" }, { status: 500 });
    }
  }
  return Response.json({ message: "Không tạo được đơn, vui lòng thử lại" }, { status: 500 });
}