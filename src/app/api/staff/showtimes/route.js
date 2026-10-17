import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest, parseId } from "@/lib/http";
import { parseVnDateTime, vnDayRange } from "@/lib/datetime";
import { SHOWTIME_INCLUDE, parsePrice, priceErrorMessage, checkSchedule } from "@/lib/showtimeRules";

export async function GET(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const sp = new URL(request.url).searchParams;
  const cinemaId = parseId(sp.get("cinemaId"));
  const movieId = parseId(sp.get("movieId"));
  const date = sp.get("date");
  const status = sp.get("status");
  const scope = sp.get("scope") ?? "upcoming"; // upcoming | past | all

  const where = {};
  if (cinemaId) where.room = { cinemaId };
  if (movieId) where.movieId = movieId;
  if (status === "ACTIVE" || status === "CANCELLED") where.status = status;

  if (date) {
    // Lọc theo ngày (giờ Việt Nam) thì bỏ qua bộ lọc sắp tới/đã qua
    const range = vnDayRange(date);
    if (!range) return badRequest("Ngày không hợp lệ");
    where.startTime = { gte: range.start, lt: range.end };
  } else if (scope === "upcoming") {
    where.startTime = { gte: new Date() };
  } else if (scope === "past") {
    where.startTime = { lt: new Date() };
  }

  const showtimes = await prisma.showtime.findMany({
    where,
    orderBy: { startTime: scope === "past" && !date ? "desc" : "asc" },
    take: 200,
    include: SHOWTIME_INCLUDE,
  });
  return Response.json({ showtimes });
}

export async function POST(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const movieId = parseId(body.movieId);
  const roomId = parseId(body.roomId);
  if (!movieId) return badRequest("Hãy chọn phim");
  if (!roomId) return badRequest("Hãy chọn phòng chiếu");

  const startTime = parseVnDateTime(body.startTime);
  if (!startTime) return badRequest("Giờ chiếu không hợp lệ");

  const price = parsePrice(body.price);
  if (price === null) return badRequest(priceErrorMessage());

  const check = await checkSchedule({ movieId, roomId, startTime });
  if (check.error) {
    return Response.json({ message: check.error.message }, { status: check.error.status });
  }

  const showtime = await prisma.showtime.create({
    data: { movieId, roomId, startTime, endTime: check.endTime, price },
    include: SHOWTIME_INCLUDE,
  });
  return Response.json({ showtime }, { status: 201 });
}