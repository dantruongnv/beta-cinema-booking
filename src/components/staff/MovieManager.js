"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/clientApi";

const STATUS_LABEL = { NOW_SHOWING: "Đang chiếu", COMING_SOON: "Sắp chiếu", ENDED: "Ngừng chiếu" };
const AGE_RATINGS = ["P", "K", "T13", "T16", "T18"];

export default function MovieManager() {
  const [movies, setMovies] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", active: "all" });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  // Nhập phim từ TMDB
  const [showImport, setShowImport] = useState(false);
  const [importQuery, setImportQuery] = useState("");
  const [importResults, setImportResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [ratings, setRatings] = useState({}); // tmdbId -> phân loại độ tuổi đã chọn

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.status) params.set("status", filters.status);
    if (filters.active !== "all") params.set("active", filters.active);

    const result = await apiRequest(`/api/staff/movies?${params.toString()}`);
    if (result.ok) {
      setMovies(result.data.movies ?? []);
      setMessage((m) => (m.type === "error" ? { type: "", text: "" } : m));
    } else {
      setMessage({ type: "error", text: result.message });
    }
    setLoading(false);
  }, [filters]);

  // Chờ 300ms sau khi ngừng gõ rồi mới tải
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function searchTmdb(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setImporting(true);
    const result = await apiRequest(`/api/staff/tmdb/search?q=${encodeURIComponent(importQuery)}`);
    setImporting(false);

    if (!result.ok) {
      setImportResults([]);
      setMessage({ type: "error", text: result.message });
      return;
    }
    const list = result.data.results ?? [];
    setImportResults(list);
    if (list.length === 0) setMessage({ type: "error", text: "Không tìm thấy phim nào trên TMDB" });
  }

  async function importMovie(item) {
    const ageRating = ratings[item.tmdbId];
    if (!ageRating) {
      setMessage({ type: "error", text: "Hãy chọn phân loại độ tuổi trước khi nhập phim" });
      return;
    }
    setMessage({ type: "", text: "" });

    const result = await apiRequest("/api/staff/movies/import", {
      method: "POST",
      body: { tmdbId: item.tmdbId, ageRating },
    });
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }

    setImportResults((list) => list.map((r) => (r.tmdbId === item.tmdbId ? { ...r, imported: true } : r)));
    setMessage({
      type: "success",
      text: result.data.durationAssumed
        ? `Đã nhập "${item.title}". TMDB chưa có thời lượng nên tạm đặt 120 phút, hãy chỉnh lại.`
        : `Đã nhập "${item.title}"`,
    });
    load();
  }

  async function toggleActive(movie) {
    const result = await apiRequest(`/api/staff/movies/${movie.id}`, {
      method: "PATCH",
      body: { isActive: !movie.isActive },
    });
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: movie.isActive ? "Đã ẩn phim" : "Đã hiện phim" });
    load();
  }

  async function handleDelete(movie) {
    if (!window.confirm(`Xóa phim "${movie.title}"? Thao tác này không thể hoàn tác.`)) return;
    const result = await apiRequest(`/api/staff/movies/${movie.id}`, { method: "DELETE" });
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: "Đã xóa phim" });
    load();
  }

  const inputClass = "rounded border p-2 text-black";

  return (
    <div className="flex flex-col gap-4">
      {/* Bộ lọc */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Tìm theo tên phim..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className={`${inputClass} w-64`}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={inputClass}>
          <option value="">Mọi trạng thái chiếu</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={filters.active} onChange={(e) => setFilters({ ...filters, active: e.target.value })} className={inputClass}>
          <option value="all">Hiện và ẩn</option>
          <option value="active">Đang hiện</option>
          <option value="inactive">Đã ẩn</option>
        </select>
        <button onClick={() => setShowImport((v) => !v)} className="ml-auto rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          {showImport ? "Đóng nhập phim" : "+ Nhập phim từ TMDB"}
        </button>
      </div>

      {message.text && (
        <p className={message.type === "error" ? "text-red-500" : "text-green-500"}>{message.text}</p>
      )}

      {/* Khung nhập phim từ TMDB */}
      {showImport && (
        <div className="flex flex-col gap-3 rounded border p-4">
          <h2 className="font-semibold">Tìm phim trên TMDB</h2>
          <form onSubmit={searchTmdb} className="flex gap-2">
            <input
              placeholder="Nhập tên phim (ít nhất 2 ký tự)..."
              value={importQuery}
              onChange={(e) => setImportQuery(e.target.value)}
              required
              className={`${inputClass} w-80`}
            />
            <button type="submit" disabled={importing} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
              {importing ? "Đang tìm..." : "Tìm"}
            </button>
          </form>
          <p className="text-xs">
            Phân loại độ tuổi: P (mọi lứa tuổi), K (dưới 13 tuổi cần có người bảo hộ), T13, T16, T18. TMDB không có phân loại này nên nhân viên tự chọn.
          </p>

          <div className="flex flex-col gap-3">
            {importResults.map((item) => (
              <div key={item.tmdbId} className="flex gap-3 rounded border p-2">
                {item.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.posterUrl} alt="" className="h-24 w-16 rounded object-cover" />
                ) : (
                  <div className="h-24 w-16 rounded bg-gray-700" />
                )}
                <div className="flex flex-1 flex-col gap-1 text-sm">
                  <p className="font-semibold">
                    {item.title}
                    {item.originalTitle && item.originalTitle !== item.title ? ` (${item.originalTitle})` : ""}
                  </p>
                  <p>Khởi chiếu: {item.releaseDate ?? "chưa rõ"}</p>
                  <p className="line-clamp-2">{item.overview || "Chưa có mô tả"}</p>
                </div>
                <div className="flex flex-col items-end justify-center gap-2">
                  <select
                    value={ratings[item.tmdbId] ?? ""}
                    onChange={(e) => setRatings({ ...ratings, [item.tmdbId]: e.target.value })}
                    disabled={item.imported}
                    className={inputClass}
                  >
                    <option value="">Độ tuổi...</option>
                    {AGE_RATINGS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => importMovie(item)}
                    disabled={item.imported}
                    className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {item.imported ? "Đã nhập" : "Nhập"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bảng danh sách phim */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Poster</th>
              <th className="p-2">Tên phim</th>
              <th className="p-2">Thể loại</th>
              <th className="p-2">Thời lượng</th>
              <th className="p-2">Độ tuổi</th>
              <th className="p-2">Khởi chiếu</th>
              <th className="p-2">Trạng thái</th>
              <th className="p-2">Số suất</th>
              <th className="p-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {movies.map((m) => (
              <tr key={m.id} className="border-b">
                <td className="p-2">
                  {m.posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.posterUrl} alt="" className="h-16 w-11 rounded object-cover" />
                  ) : (
                    <div className="h-16 w-11 rounded bg-gray-700" />
                  )}
                </td>
                <td className="p-2 font-medium">{m.title}</td>
                <td className="p-2">{m.genres ?? "-"}</td>
                <td className="p-2">{m.durationMin} phút</td>
                <td className="p-2">{m.ageRating ?? "-"}</td>
                <td className="p-2">
                  {m.releaseDate ? new Date(m.releaseDate).toLocaleDateString("vi-VN", { timeZone: "UTC" }) : "-"}
                </td>
                <td className="p-2">
                  {STATUS_LABEL[m.status]}
                  {!m.isActive && " (đã ẩn)"}
                </td>
                <td className="p-2">{m._count.showtimes}</td>
                <td className="flex gap-2 p-2">
                  <button onClick={() => toggleActive(m)} className="underline">{m.isActive ? "Ẩn" : "Hiện"}</button>
                  <button onClick={() => handleDelete(m)} className="text-red-500 underline">Xóa</button>
                </td>
              </tr>
            ))}
            {!loading && movies.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center">Không có phim nào</td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className="p-2 text-sm">Đang tải...</p>}
      </div>
    </div>
  );
}