import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { MAX_ROWS, MAX_SEATS_PER_ROW } from "@/lib/seatLayout";

const SEAT_TYPES = ["NORMAL", "VIP", "COUPLE"];

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Kiểm tra danh sách seatIds hợp lệ và đều thuộc phòng này
async function loadSeatIds(roomId, body) {
  const ids = Array.isArray(body?.seatIds) ? [...new Set(body.seatIds.map(Number))] : [];
  if (ids.length === 0 || ids.length > 400 || ids.some((n) => !Number.isInteger(n) || n <= 0)) {
    return { error: badRequest("Danh sách ghế không hợp lệ") };
  }
  const count = await prisma.seat.count({ where: { id: { in: ids }, roomId } });
  if (count !== ids.length) {
    return { error: Response.json({ message: "Có ghế không thuộc phòng này" }, { status: 404 }) };
  }
  return { seatIds: ids };
}

// Xem sơ đồ ghế của phòng
export async function GET(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const roomId = parseId((await params).id);
  if (!roomId) return badRequest("Mã phòng không hợp lệ");

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, name: true, isActive: true, cinema: { select: { id: true, name: true } } },
  });
  if (!room) {
    return Response.json({ message: "Không tìm thấy phòng" }, { status: 404 });
  }

  const seats = await prisma.seat.findMany({
    where: { roomId },
    orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }],
    select: {
      id: true,
      rowLabel: true,
      seatNumber: true,
      type: true,
      isActive: true,
      _count: { select: { bookingSeats: true } },
    },
  });

  return Response.json({ room, seats });
}

// Thêm hàng, thêm ghế vào hàng, hoặc xóa nhiều ghế (phân biệt bằng "action")
export async function POST(request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const roomId = parseId((await params).id);
  if (!roomId) return badRequest("Mã phòng không hợp lệ");

  const body = await readBody(request);
  if (!body) return badRequest("Dữ liệu không hợp lệ");

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) {
    return Response.json({ message: "Không tìm thấy phòng" }, { status: 404 });
  }

  try {
    if (body.action === "addRow") {
      const seatsPerRow = Number(body.seatsPerRow);
      const type = body.type ?? "NORMAL";
      if (!Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > MAX_SEATS_PER_ROW) {
        return badRequest(`Số ghế mỗi hàng phải từ 1 đến ${MAX_SEATS_PER_ROW}`);
      }
      if (!SEAT_TYPES.includes(type)) return badRequest("Loại ghế không hợp lệ");

      const last = await prisma.seat.findFirst({
        where: { roomId },
        orderBy: { rowLabel: "desc" },
        select: { rowLabel: true },
      });
      const nextCode = last ? last.rowLabel.charCodeAt(0) + 1 : 65;
      if (nextCode - 64 > MAX_ROWS) {
        return badRequest(`Phòng đã đạt tối đa ${MAX_ROWS} hàng ghế`);
      }
      const rowLabel = String.fromCharCode(nextCode);

      await prisma.seat.createMany({
        data: Array.from({ length: seatsPerRow }, (_, i) => ({
          roomId,
          rowLabel,
          seatNumber: i + 1,
          type,
        })),
      });
      return Response.json({ ok: true, rowLabel }, { status: 201 });
    }

    if (body.action === "addSeat") {
      const rowLabel = String(body.rowLabel ?? "").toUpperCase();
      if (!/^[A-Z]$/.test(rowLabel)) return badRequest("Hàng ghế không hợp lệ");

      const last = await prisma.seat.findFirst({
        where: { roomId, rowLabel },
        orderBy: { seatNumber: "desc" },
        select: { seatNumber: true, type: true },
      });
      if (!last) {
        return Response.json({ message: "Hàng ghế không tồn tại" }, { status: 404 });
      }
      if (last.seatNumber >= MAX_SEATS_PER_ROW) {
        return badRequest(`Mỗi hàng tối đa ${MAX_SEATS_PER_ROW} ghế`);
      }

      const seat = await prisma.seat.create({
        data: { roomId, rowLabel, seatNumber: last.seatNumber + 1, type: last.type },
      });
      return Response.json({ seat }, { status: 201 });
    }

    if (body.action === "delete") {
      const { seatIds, error } = await loadSeatIds(roomId, body);
      if (error) return error;

      // Ghế đã từng được đặt vé thì giữ lại để không mất lịch sử
      const used = await prisma.bookingSeat.count({ where: { seatId: { in: seatIds } } });
      if (used > 0) {
        return Response.json(
          { message: "Có ghế đã được đặt vé nên không thể xóa, hãy vô hiệu hóa ghế thay vì xóa" },
          { status: 409 }
        );
      }

      const result = await prisma.seat.deleteMany({ where: { id: { in: seatIds } } });
      return Response.json({ ok: true, deleted: result.count });
    }

    return badRequest("Hành động không hợp lệ");
  } catch (err) {
    if (err.code === "P2002") {
      return Response.json({ message: "Ghế đã tồn tại, vui lòng tải lại trang" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}

// Đổi loại ghế / vô hiệu hóa / kích hoạt nhiều ghế cùng lúc
export async function PATCH(request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const roomId = parseId((await params).id);
  if (!roomId) return badRequest("Mã phòng không hợp lệ");

  const body = await readBody(request);
  if (!body) return badRequest("Dữ liệu không hợp lệ");

  const { seatIds, error } = await loadSeatIds(roomId, body);
  if (error) return error;

  const data = {};
  if (body.type !== undefined) {
    if (!SEAT_TYPES.includes(body.type)) return badRequest("Loại ghế không hợp lệ");
    data.type = body.type;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return badRequest("Trạng thái không hợp lệ");
    data.isActive = body.isActive;
  }
  if (Object.keys(data).length === 0) return badRequest("Không có dữ liệu cần cập nhật");

  // Không vô hiệu hóa ghế đang được giữ/đặt cho suất chiếu sắp tới
  if (data.isActive === false) {
    const upcoming = await prisma.bookingSeat.count({
      where: { seatId: { in: seatIds }, showtime: { startTime: { gt: new Date() } } },
    });
    if (upcoming > 0) {
      return Response.json(
        { message: `Các ghế đã chọn đang có ${upcoming} vé cho suất chiếu sắp tới nên không thể vô hiệu hóa` },
        { status: 409 }
      );
    }
  }

  const result = await prisma.seat.updateMany({ where: { id: { in: seatIds } }, data });
  return Response.json({ ok: true, updated: result.count });
}