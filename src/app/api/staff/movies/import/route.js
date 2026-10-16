import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest } from "@/lib/http";
import { AGE_RATINGS } from "@/lib/validators";
import { getTmdbMovie } from "@/lib/tmdb";

const DAY = 24 * 60 * 60 * 1000;

export async function POST(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const tmdbId = Number(body.tmdbId);
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) return badRequest("Mã phim TMDB không hợp lệ");
  if (!AGE_RATINGS.includes(body.ageRating)) {
    return badRequest("Hãy chọn phân loại độ tuổi cho phim");
  }

  const existing = await prisma.movie.findUnique({ where: { tmdbId }, select: { id: true } });
  if (existing) {
    return Response.json({ message: "Phim này đã được nhập vào hệ thống" }, { status: 409 });
  }

  let info;
  try {
    info = await getTmdbMovie(tmdbId);
  } catch (err) {
    console.error(err);
    if (err.message?.startsWith("Thiếu TMDB_TOKEN")) {
      return Response.json({ message: err.message }, { status: 500 });
    }
    const notFound = err.message?.includes("404");
    return Response.json(
      { message: notFound ? "Không tìm thấy phim trên TMDB" : "Không lấy được dữ liệu từ TMDB" },
      { status: notFound ? 404 : 502 }
    );
  }

  // Tự đặt trạng thái theo ngày khởi chiếu (nhân viên có thể sửa sau)
  const releaseDate = info.releaseDate ? new Date(info.releaseDate) : null;
  let status = "COMING_SOON";
  if (releaseDate && releaseDate <= new Date()) {
    status = Date.now() - releaseDate.getTime() <= 60 * DAY ? "NOW_SHOWING" : "ENDED";
  }

  // TMDB đôi khi chưa có thời lượng (phim sắp chiếu): tạm đặt 120 phút để nhân viên chỉnh lại
  const durationAssumed = !info.durationMin;

  try {
    const movie = await prisma.movie.create({
      data: {
        tmdbId: info.tmdbId,
        title: info.title,
        originalTitle: info.originalTitle,
        overview: info.overview ? info.overview.slice(0, 5000) : null,
        genres: info.genres,
        durationMin: info.durationMin || 120,
        ageRating: body.ageRating,
        posterUrl: info.posterUrl,
        backdropUrl: info.backdropUrl,
        trailerKey: info.trailerKey,
        releaseDate,
        status,
      },
    });
    return Response.json({ movie, durationAssumed }, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return Response.json({ message: "Phim này đã được nhập vào hệ thống" }, { status: 409 });
    }
    console.error(err);
    return Response.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }
}