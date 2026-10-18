import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { vnDayRange } from "@/lib/datetime";

const BOOKING_STAFF_INCLUDE = {
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  payment: true,
  showtime: {
    include: {
      movie: { select: { id: true, title: true, posterUrl: true, durationMin: true } },
      room: { select: { id: true, name: true, cinema: { select: { id: true, name: true } } } },
    },
  },
  seats: {
    include: {
      seat: { select: { id: true, rowLabel: true, seatNumber: true, type: true } },
    },
    orderBy: [{ seat: { rowLabel: "asc" } }, { seat: { seatNumber: "asc" } }],
  },
};

export async function GET(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const sp = new URL(request.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const status = sp.get("status");
  const cinemaId = parseId(sp.get("cinemaId"));
  const movieId = parseId(sp.get("movieId"));
  const date = sp.get("date");

  const where = {};

  if (["PENDING", "PAID", "CANCELLED", "EXPIRED"].includes(status)) {
    where.status = status;
  }

  if (q) {
    where.OR = [
      { code: { contains: q.toUpperCase() } },
      { user: { fullName: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { phone: { contains: q } } },
    ];
  }

  const showtimeWhere = {};
  if (cinemaId) {
    showtimeWhere.room = { cinemaId };
  }
  if (movieId) {
    showtimeWhere.movieId = movieId;
  }
  if (date) {
    const range = vnDayRange(date);
    if (!range) return badRequest("Ngày không hợp lệ");
    showtimeWhere.startTime = { gte: range.start, lt: range.end };
  }

  if (Object.keys(showtimeWhere).length > 0) {
    where.showtime = showtimeWhere;
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: BOOKING_STAFF_INCLUDE,
    }),
    prisma.booking.count({ where }),
  ]);

  return Response.json({ bookings, total });
}
