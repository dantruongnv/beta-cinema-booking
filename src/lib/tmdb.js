const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbImageUrl(path, size = "w500") {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

async function tmdbFetch(path, params = {}) {
  const token = process.env.TMDB_TOKEN;
  if (!token) throw new Error("Thiếu TMDB_TOKEN trong biến môi trường");

  const url = new URL(`${TMDB_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`TMDB trả về lỗi ${res.status}`);
  return res.json();
}

// Tìm phim theo tên (kết quả tiếng Việt nếu có)
export async function searchTmdbMovies(query) {
  const data = await tmdbFetch("/search/movie", {
    query,
    language: "vi-VN",
    include_adult: "false",
    page: "1",
  });
  return (data.results ?? []).slice(0, 12).map((m) => ({
    tmdbId: m.id,
    title: m.title,
    originalTitle: m.original_title,
    releaseDate: m.release_date || null,
    overview: m.overview ?? "",
    posterUrl: tmdbImageUrl(m.poster_path, "w185"),
  }));
}

// Lấy chi tiết một phim và đổi sang cấu trúc bảng Movie của hệ thống
export async function getTmdbMovie(tmdbId) {
  const movie = await tmdbFetch(`/movie/${tmdbId}`, {
    language: "vi-VN",
    append_to_response: "videos",
    include_video_language: "vi,en,null",
  });

  // Chưa có mô tả tiếng Việt thì lấy mô tả tiếng Anh
  let overview = movie.overview ?? "";
  if (!overview) {
    try {
      const en = await tmdbFetch(`/movie/${tmdbId}`, { language: "en-US" });
      overview = en.overview ?? "";
    } catch {
      // bỏ qua, để trống mô tả
    }
  }

  // Chọn trailer YouTube: ưu tiên Trailer chính thức
  const videos = (movie.videos?.results ?? []).filter((v) => v.site === "YouTube");
  const trailer =
    videos.find((v) => v.type === "Trailer" && v.official) ??
    videos.find((v) => v.type === "Trailer") ??
    videos.find((v) => v.type === "Teaser") ??
    null;

  return {
    tmdbId: movie.id,
    title: movie.title,
    originalTitle: movie.original_title ?? null,
    overview,
    genres: (movie.genres ?? []).map((g) => g.name).join(", ") || null,
    durationMin: movie.runtime || null,
    posterUrl: tmdbImageUrl(movie.poster_path, "w500"),
    backdropUrl: tmdbImageUrl(movie.backdrop_path, "w1280"),
    trailerKey: trailer?.key ?? null,
    releaseDate: movie.release_date || null,
  };
}