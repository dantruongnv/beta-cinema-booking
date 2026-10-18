"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/clientApi";

const STATUS_LABEL = { NOW_SHOWING: "Đang chiếu", COMING_SOON: "Sắp chiếu", ENDED: "Ngừng chiếu" };
const AGE_RATINGS = ["P", "K", "T13", "T16", "T18"];

const EMPTY_FORM = {
  title: "",
  originalTitle: "",
  overview: "",
  genres: "",
  durationMin: "120",
  ageRating: "",
  releaseDate: "",
  status: "COMING_SOON",
  posterUrl: "",
  backdropUrl: "",
  trailerKey: "",
};

// Cho phép dán cả đường dẫn YouTube, tự lấy mã video
function extractYoutubeKey(input) {
  const value = String(input ?? "").trim();
  const match = value.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,20})/);
  return match ? match[1] : value;
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      {label}
      {children}
    </label>
  );
}

export default function MovieManager() {
  const [movies, setMovies] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", active: "all" });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  // Form thêm/sửa phim
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = đang thêm mới
  const [showForm, setShowForm] = useState(false);

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

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setShowImport(false);
    setMessage({ type: "", text: "" });
    scrollToTop();
  }

  function openEdit(movie) {
    setEditingId(movie.id);
    setForm({
      title: movie.title,
      originalTitle: movie.originalTitle ?? "",
      overview: movie.overview ?? "",
      genres: movie.genres ?? "",
      durationMin: String(movie.durationMin),
      ageRating: movie.ageRating ?? "",
      releaseDate: movie.releaseDate ? movie.releaseDate.slice(0, 10) : "",
      status: movie.status,
      posterUrl: movie.posterUrl ?? "",
      backdropUrl: movie.backdropUrl ?? "",
      trailerKey: movie.trailerKey ?? "",
    });
    setShowForm(true);
    setShowImport(false);
    setMessage({ type: "", text: "" });
    scrollToTop();
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    const body = { ...form, trailerKey: extractYoutubeKey(form.trailerKey) };
    const result = editingId
      ? await apiRequest(`/api/staff/movies/${editingId}`, { method: "PATCH", body })
      : await apiRequest("/api/staff/movies", { method: "POST", body });

    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: editingId ? "Đã cập nhật phim" : "Đã thêm phim mới" });
    closeForm();
    load();
  }

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
        ? `Đã nhập "${item.title}". TMDB chưa có thời lượng nên tạm đặt 120 phút, hãy bấm Sửa để chỉnh lại.`
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
      if (result.data?.hasBookings) {
        const confirmForce = window.confirm(
          `CẢNH BÁO: Phim "${movie.title}" đã có ${result.data.bookingsCount} đơn đặt vé!\n\nBạn có muốn XÓA CƯỠNG BỨC (xóa sạch phim cùng toàn bộ vé và suất chiếu liên quan) không?`
        );
        if (confirmForce) {
          const forceRes = await apiRequest(`/api/staff/movies/${movie.id}?force=true`, { method: "DELETE" });
          if (forceRes.ok) {
            setMessage({ type: "success", text: `Đã xóa cưỡng bức phim "${movie.title}" và toàn bộ vé/suất chiếu liên quan.` });
            load();
            return;
          }
          setMessage({ type: "error", text: forceRes.message });
          return;
        }
      }
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: "Đã xóa phim" });
    load();
  }

  const inputClass = "rounded border p-2 text-black";
  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

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
        <div className="ml-auto flex gap-2">
          <button onClick={openCreate} className="rounded border px-4 py-2 font-semibold">
            + Thêm phim thủ công
          </button>
          <button
            onClick={() => {
              setShowImport((v) => !v);
              closeForm();
            }}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white"
          >
            {showImport ? "Đóng nhập phim" : "+ Nhập phim từ TMDB"}
          </button>
        </div>
      </div>

      {message.text && (
        <p className={message.type === "error" ? "text-red-500" : "text-green-500"}>{message.text}</p>
      )}

      {/* Form thêm/sửa phim */}
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border p-4">
          <h2 className="font-semibold">{editingId ? "Sửa thông tin phim" : "Thêm phim thủ công"}</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Tên phim *">
              <input value={form.title} onChange={setField("title")} required className={inputClass} />
            </Field>
            <Field label="Tên gốc">
              <input value={form.originalTitle} onChange={setField("originalTitle")} className={inputClass} />
            </Field>
            <Field label="Thể loại (ví dụ: Hành động, Phiêu lưu)">
              <input value={form.genres} onChange={setField("genres")} className={inputClass} />
            </Field>
            <Field label="Thời lượng (phút) *">
              <input type="number" min="1" max="600" value={form.durationMin} onChange={setField("durationMin")} required className={inputClass} />
            </Field>
            <Field label="Phân loại độ tuổi">
              <select value={form.ageRating} onChange={setField("ageRating")} className={inputClass}>
                <option value="">Chưa phân loại</option>
                {AGE_RATINGS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Ngày khởi chiếu">
              <input type="date" value={form.releaseDate} onChange={setField("releaseDate")} className={inputClass} />
            </Field>
            <Field label="Trạng thái chiếu">
              <select value={form.status} onChange={setField("status")} className={inputClass}>
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Trailer YouTube (dán đường dẫn hoặc mã video)">
              <input value={form.trailerKey} onChange={setField("trailerKey")} className={inputClass} />
            </Field>
            <Field label="Đường dẫn poster (https://...)" className="md:col-span-2">
              <input value={form.posterUrl} onChange={setField("posterUrl")} className={inputClass} />
            </Field>
            <Field label="Đường dẫn ảnh nền (https://...)" className="md:col-span-2">
              <input value={form.backdropUrl} onChange={setField("backdropUrl")} className={inputClass} />
            </Field>
            <Field label="Mô tả" className="md:col-span-2">
              <textarea rows={4} value={form.overview} onChange={setField("overview")} className={inputClass} />
            </Field>
          </div>

          {form.posterUrl.startsWith("https://") && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.posterUrl} alt="Xem trước poster" className="h-32 w-auto self-start rounded" />
          )}

          {editingId && (
            <p className="text-xs">
              Lưu ý: đổi thời lượng không làm thay đổi giờ kết thúc của các suất chiếu đã tạo trước đó.
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Lưu</button>
            <button type="button" onClick={closeForm} className="rounded border px-4 py-2">Hủy</button>
          </div>
        </form>
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
                  <button onClick={() => openEdit(m)} className="underline">Sửa</button>
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