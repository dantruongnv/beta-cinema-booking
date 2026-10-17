"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/clientApi";
import { formatVn, parseVnDateTime, toVnInputValue } from "@/lib/datetime";
import { CLEANING_MINUTES } from "@/lib/constants";

const STATUS_LABEL = { ACTIVE: "Hoạt động", CANCELLED: "Đã hủy" };
const EMPTY_FORM = { cinemaId: "", roomId: "", movieId: "", startTime: "", price: "90000" };

function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      {label}
      {children}
    </label>
  );
}

export default function ShowtimeManager() {
  const [options, setOptions] = useState({ cinemas: [], movies: [] });
  const [showtimes, setShowtimes] = useState([]);
  const [filters, setFilters] = useState({ cinemaId: "", movieId: "", date: "", scope: "upcoming", status: "" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null); // suất chiếu đang sửa (null = đang thêm mới)
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(0);

  // Tải danh sách rạp/phòng/phim cho các ô chọn
  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      const result = await apiRequest("/api/staff/showtimes/options");
      if (cancelled) return;
      if (result.ok) setOptions(result.data);
      else setMessage({ type: "error", text: result.message });
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    const result = await apiRequest(`/api/staff/showtimes?${params.toString()}`);
    if (result.ok) {
      setShowtimes(result.data.showtimes ?? []);
      setNow(Date.now());
      setMessage((m) => (m.type === "error" ? { type: "", text: "" } : m));
    } else {
      setMessage({ type: "error", text: result.message });
    }
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMessage({ type: "", text: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      cinemaId: String(s.room.cinema.id),
      roomId: String(s.room.id),
      movieId: String(s.movie.id),
      startTime: toVnInputValue(s.startTime),
      price: String(s.price),
    });
    setShowForm(true);
    setMessage({ type: "", text: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    let result;
    if (!editing) {
      result = await apiRequest("/api/staff/showtimes", {
        method: "POST",
        body: { movieId: form.movieId, roomId: form.roomId, startTime: form.startTime, price: form.price },
      });
    } else {
      // Chỉ gửi những trường đã thay đổi
      const body = {};
      if (form.movieId !== String(editing.movie.id)) body.movieId = form.movieId;
      if (form.roomId !== String(editing.room.id)) body.roomId = form.roomId;
      if (form.startTime !== toVnInputValue(editing.startTime)) body.startTime = form.startTime;
      if (form.price !== String(editing.price)) body.price = form.price;
      if (Object.keys(body).length === 0) {
        setMessage({ type: "error", text: "Bạn chưa thay đổi thông tin nào" });
        return;
      }
      result = await apiRequest(`/api/staff/showtimes/${editing.id}`, { method: "PATCH", body });
    }

    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: editing ? "Đã cập nhật suất chiếu" : "Đã thêm suất chiếu" });
    closeForm();
    load();
  }

  async function changeStatus(s, status) {
    const text = status === "CANCELLED" ? "Hủy suất chiếu này?" : "Kích hoạt lại suất chiếu này?";
    if (!window.confirm(text)) return;
    const result = await apiRequest(`/api/staff/showtimes/${s.id}`, { method: "PATCH", body: { status } });
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: status === "CANCELLED" ? "Đã hủy suất chiếu" : "Đã kích hoạt lại suất chiếu" });
    load();
  }

  async function handleDelete(s) {
    if (!window.confirm(`Xóa suất chiếu "${s.movie.title}" lúc ${formatVn(s.startTime)}? Thao tác này không thể hoàn tác.`)) return;
    const result = await apiRequest(`/api/staff/showtimes/${s.id}`, { method: "DELETE" });
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: "Đã xóa suất chiếu" });
    load();
  }

  const inputClass = "rounded border p-2 text-black";
  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const locked = editing ? editing._count.bookingSeats > 0 : false; // đã có vé đặt: chỉ đổi giá
  const rooms = options.cinemas.find((c) => String(c.id) === form.cinemaId)?.rooms ?? [];
  const selectedMovie = options.movies.find((m) => String(m.id) === form.movieId);
  const start = parseVnDateTime(form.startTime);
  const endPreview =
    selectedMovie && start
      ? formatVn(new Date(start.getTime() + (selectedMovie.durationMin + CLEANING_MINUTES) * 60000))
      : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Bộ lọc */}
      <div className="flex flex-wrap items-end gap-3">
        <select value={filters.cinemaId} onChange={(e) => setFilters({ ...filters, cinemaId: e.target.value })} className={inputClass}>
          <option value="">Tất cả rạp</option>
          {options.cinemas.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={filters.movieId} onChange={(e) => setFilters({ ...filters, movieId: e.target.value })} className={inputClass}>
          <option value="">Tất cả phim</option>
          {options.movies.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>
        <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className={inputClass} />
        <select value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })} className={inputClass}>
          <option value="upcoming">Sắp tới</option>
          <option value="past">Đã qua</option>
          <option value="all">Tất cả</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className={inputClass}>
          <option value="">Mọi trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
        {filters.date && (
          <button onClick={() => setFilters({ ...filters, date: "" })} className="text-sm underline">Bỏ lọc ngày</button>
        )}
        <button onClick={openCreate} className="ml-auto rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          + Thêm suất chiếu
        </button>
      </div>
      <p className="text-xs">Khi chọn một ngày cụ thể, bộ lọc Sắp tới/Đã qua sẽ không được áp dụng. Giờ hiển thị theo giờ Việt Nam.</p>

      {message.text && (
        <p className={message.type === "error" ? "text-red-500" : "text-green-500"}>{message.text}</p>
      )}

      {/* Form thêm/sửa */}
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border p-4">
          <h2 className="font-semibold">{editing ? "Sửa suất chiếu" : "Thêm suất chiếu"}</h2>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Rạp *">
              <select
                value={form.cinemaId}
                onChange={(e) => setForm({ ...form, cinemaId: e.target.value, roomId: "" })}
                required
                disabled={locked}
                className={inputClass}
              >
                <option value="">Chọn rạp...</option>
                {options.cinemas.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Phòng chiếu *">
              <select value={form.roomId} onChange={setField("roomId")} required disabled={locked || !form.cinemaId} className={inputClass}>
                <option value="">Chọn phòng...</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Phim *">
              <select value={form.movieId} onChange={setField("movieId")} required disabled={locked} className={inputClass}>
                <option value="">Chọn phim...</option>
                {options.movies.map((m) => (
                  <option key={m.id} value={m.id}>{m.title} ({m.durationMin} phút)</option>
                ))}
              </select>
            </Field>
            <Field label="Giờ bắt đầu (giờ Việt Nam) *">
              <input type="datetime-local" value={form.startTime} onChange={setField("startTime")} required disabled={locked} className={inputClass} />
            </Field>
            <Field label="Giá vé (đồng) *">
              <input type="number" min="10000" max="2000000" step="1000" value={form.price} onChange={setField("price")} required className={inputClass} />
            </Field>
          </div>

          {endPreview && (
            <p className="text-sm">
              Giờ kết thúc dự kiến: <b>{endPreview}</b> (thời lượng phim + {CLEANING_MINUTES} phút dọn phòng)
            </p>
          )}
          {locked && (
            <p className="text-sm text-amber-500">
              Suất chiếu này đã có {editing._count.bookingSeats} ghế được đặt nên chỉ được đổi giá vé.
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Lưu</button>
            <button type="button" onClick={closeForm} className="rounded border px-4 py-2">Hủy</button>
          </div>
        </form>
      )}

      {/* Bảng danh sách */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Phim</th>
              <th className="p-2">Rạp</th>
              <th className="p-2">Phòng</th>
              <th className="p-2">Bắt đầu</th>
              <th className="p-2">Kết thúc</th>
              <th className="p-2">Giá vé</th>
              <th className="p-2">Ghế đã đặt</th>
              <th className="p-2">Trạng thái</th>
              <th className="p-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {showtimes.map((s) => {
              const started = new Date(s.startTime).getTime() <= now;
              return (
                <tr key={s.id} className="border-b">
                  <td className="p-2 font-medium">{s.movie.title}</td>
                  <td className="p-2">{s.room.cinema.name}</td>
                  <td className="p-2">{s.room.name}</td>
                  <td className="p-2">{formatVn(s.startTime)}</td>
                  <td className="p-2">{formatVn(s.endTime)}</td>
                  <td className="p-2">{Number(s.price).toLocaleString("vi-VN")}đ</td>
                  <td className="p-2">{s._count.bookingSeats}/{s.room._count.seats}</td>
                  <td className="p-2">
                    {STATUS_LABEL[s.status]}
                    {started && " (đã bắt đầu)"}
                  </td>
                  <td className="flex gap-2 p-2">
                    {!started && <button onClick={() => openEdit(s)} className="underline">Sửa</button>}
                    {!started && s.status === "ACTIVE" && (
                      <button onClick={() => changeStatus(s, "CANCELLED")} className="underline">Hủy suất</button>
                    )}
                    {!started && s.status === "CANCELLED" && (
                      <button onClick={() => changeStatus(s, "ACTIVE")} className="underline">Kích hoạt lại</button>
                    )}
                    <button onClick={() => handleDelete(s)} className="text-red-500 underline">Xóa</button>
                  </td>
                </tr>
              );
            })}
            {!loading && showtimes.length === 0 && (
              <tr>
                <td colSpan={9} className="p-4 text-center">Không có suất chiếu nào</td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className="p-2 text-sm">Đang tải...</p>}
      </div>
    </div>
  );
}