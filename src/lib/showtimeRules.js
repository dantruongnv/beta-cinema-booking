import { prisma } from "@/lib/prisma";
import { formatVn } from "@/lib/datetime";
import { CLEANING_MINUTES, MIN_PRICE, MAX_PRICE } from "@/lib/constants";

// Dữ liệu trả về cho mỗi suất chiếu
export const SHOWTIME_INCLUDE = {
  movie: { select: { id: true, title: true, durationMin: true } },
  room: {
    select: {
      id: true,
      name: true,
      cinema: { select: { id: true, name: true } },
      _count: { select: { seats: { where: { isActive: true } } } },
    },
  },
  _count: { select: { bookingSeats: true } },
};

const dots = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function parsePrice(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= MIN_PRICE && n <= MAX_PRICE ? n : null;
}

export function priceErrorMessage() {
  return `Giá vé phải là số nguyên từ ${dots(MIN_PRICE)} đến ${dots(MAX_PRICE)} đồng`;
}

// Giờ kết thúc = bắt đầu + thời lượng phim + thời gian dọn phòng
export function calcEndTime(startTime, durationMin) {
  return new Date(startTime.getTime() + (durationMin + CLEANING_MINUTES) * 60000);
}

// Tìm suất ACTIVE trùng giờ trong cùng phòng (excludeId: bỏ qua chính nó khi sửa)
export async function findConflict({ roomId, startTime, endTime, excludeId }) {
  return prisma.showtime.findFirst({
    where: {
      roomId,
      status: "ACTIVE",
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    include: { movie: { select: { title: true } } },
  });
}

// Kiểm tra có xếp lịch được không. Trả về { endTime } hoặc { error: { status, message } }
export async function checkSchedule({ movieId, roomId, startTime, excludeId }) {
  const [movie, room] = await Promise.all([
    prisma.movie.findUnique({ where: { id: movieId } }),
    prisma.room.findUnique({ where: { id: roomId }, include: { cinema: true } }),
  ]);
  if (!movie) return { error: { status: 404, message: "Không tìm thấy phim" } };
  if (!room) return { error: { status: 404, message: "Không tìm thấy phòng chiếu" } };

  if (!movie.isActive || movie.status === "ENDED") {
    return { error: { status: 409, message: "Phim đang bị ẩn hoặc đã ngừng chiếu nên không thể xếp lịch" } };
  }
  if (!room.isActive || !room.cinema.isActive) {
    return { error: { status: 409, message: "Phòng hoặc rạp đang bị ẩn nên không thể xếp lịch" } };
  }
  const seatCount = await prisma.seat.count({ where: { roomId, isActive: true } });
  if (seatCount === 0) {
    return { error: { status: 409, message: "Phòng chưa có ghế khả dụng nên không thể xếp lịch" } };
  }
  if (startTime.getTime() <= Date.now()) {
    return { error: { status: 400, message: "Giờ chiếu phải ở tương lai" } };
  }

  const endTime = calcEndTime(startTime, movie.durationMin);
  const conflict = await findConflict({ roomId, startTime, endTime, excludeId });
  if (conflict) {
    return {
      error: {
        status: 409,
        message: `Trùng lịch với suất "${conflict.movie.title}" (${formatVn(conflict.startTime)} - ${formatVn(conflict.endTime)}) trong cùng phòng`,
      },
    };
  }

  return { endTime };
}