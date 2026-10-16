import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest } from "@/lib/http";
import { validateMovieInput, MOVIE_STATUSES } from "@/lib/validators";

export async function GET(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const status = searchParams.get("status");
  const active = searchParams.get("active");

  const where = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { originalTitle: { contains: q, mode: "insensitive" } },
    ];
  }
  if (MOVIE_STATUSES.includes(status)) where.status = status;
  if (active === "active") where.isActive = true;
  if (active === "inactive") where.isActive = false;

  const movies = await prisma.movie.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { showtimes: true } } },
  });
  return Response.json({ movies });
}

// Thêm phim thủ công (không lấy từ TMDB)
export async function POST(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const { data, error } = validateMovieInput(body);
  if (error) return badRequest(error);

  const movie = await prisma.movie.create({ data });
  return Response.json({ movie }, { status: 201 });
}