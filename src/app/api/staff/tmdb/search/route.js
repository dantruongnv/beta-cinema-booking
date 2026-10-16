import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { badRequest } from "@/lib/http";
import { searchTmdbMovies } from "@/lib/tmdb";

export async function GET(request) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return badRequest("Nhập ít nhất 2 ký tự để tìm phim");

  let results;
  try {
    results = await searchTmdbMovies(q);
  } catch (err) {
    console.error(err);
    const isConfigError = err.message?.startsWith("Thiếu TMDB_TOKEN");
    return Response.json(
      { message: isConfigError ? err.message : "Không kết nối được TMDB, vui lòng thử lại" },
      { status: isConfigError ? 500 : 502 }
    );
  }

  // Đánh dấu những phim đã được nhập vào hệ thống
  const imported = await prisma.movie.findMany({
    where: { tmdbId: { in: results.map((r) => r.tmdbId) } },
    select: { tmdbId: true },
  });
  const importedIds = new Set(imported.map((m) => m.tmdbId));

  return Response.json({
    results: results.map((r) => ({ ...r, imported: importedIds.has(r.tmdbId) })),
  });
}