import { toVnInputValue, vnDayRange } from "@/lib/datetime";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

// `count` ngày liên tiếp bắt đầu từ hôm nay (theo giờ Việt Nam)
export function getBookingDays(count = 7) {
  const todayKey = toVnInputValue(new Date()).slice(0, 10);
  const first = vnDayRange(todayKey);
  const days = [];

  for (let i = 0; i < count; i++) {
    const start = new Date(first.start.getTime() + i * DAY_MS);
    const key = toVnInputValue(start).slice(0, 10); // "YYYY-MM-DD"
    const [year, month, day] = key.split("-").map(Number);
    const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];

    days.push({
      key,
      label: i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : weekday,
      dateText: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
      start,
      end: new Date(start.getTime() + DAY_MS),
    });
  }
  return days;
}

// Chỉ hiển thị suất đang hoạt động, của phòng/rạp/phim đang hiện, phim chưa ngừng chiếu
export const PUBLIC_SHOWTIME_WHERE = {
  status: "ACTIVE",
  room: { isActive: true, cinema: { isActive: true } },
  movie: { isActive: true, status: { not: "ENDED" } },
};

export const SCHEDULE_SELECT = {
  id: true,
  startTime: true,
  endTime: true,
  price: true,
  movie: { select: { id: true, title: true, durationMin: true, ageRating: true, posterUrl: true } },
  room: {
    select: {
      name: true,
      cinema: { select: { id: true, name: true, address: true, region: true } },
      _count: { select: { seats: { where: { isActive: true } } } },
    },
  },
  _count: { select: { bookingSeats: true } },
};

// Đổi sang dữ liệu thuần (ngày dạng chuỗi) để truyền xuống thành phần giao diện
export function toPublicShowtime(s) {
  const total = s.room._count.seats;
  return {
    id: s.id,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
    price: s.price,
    roomName: s.room.name,
    cinemaId: s.room.cinema.id,
    cinemaName: s.room.cinema.name,
    cinemaAddress: s.room.cinema.address,
    region: s.room.cinema.region,
    total,
    available: Math.max(0, total - s._count.bookingSeats),
    movie: s.movie,
  };
}