"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/clientApi";
import { formatVn } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { SEAT_TYPE_LABEL } from "@/lib/pricing";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";

const STATUS_BADGE = {
  PAID: { label: "Đã thanh toán (Sắp chiếu)", bg: "bg-emerald-950/80 text-emerald-400 border-emerald-800" },
  COMPLETED: { label: "Đã hoàn thành", bg: "bg-blue-950/80 text-blue-400 border-blue-800" },
  SHOWING: { label: "Đang chiếu", bg: "bg-purple-950/80 text-purple-400 border-purple-800" },
  PENDING: { label: "Chờ thanh toán", bg: "bg-amber-950/80 text-amber-400 border-amber-800" },
  CANCELLED: { label: "Đã hủy", bg: "bg-red-950/80 text-red-400 border-red-800" },
  EXPIRED: { label: "Hết hạn giữ ghế", bg: "bg-neutral-800 text-neutral-400 border-neutral-700" },
};

export default function BookingManager() {
  const [bookings, setBookings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [options, setOptions] = useState({ cinemas: [], movies: [] });
  const [filters, setFilters] = useState({ q: "", status: "", cinemaId: "", movieId: "", date: "" });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Tải danh mục rạp và phim cho bộ lọc
  useEffect(() => {
    let cancelled = false;
    async function loadOptions() {
      const res = await apiRequest("/api/staff/bookings/options");
      if (cancelled) return;
      if (res.ok) setOptions(res.data);
    }
    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tải danh sách đơn đặt vé
  const loadBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params.set(k, v);
    }

    const res = await apiRequest(`/api/staff/bookings?${params.toString()}`);
    setLoading(false);

    if (res.ok) {
      setBookings(res.data.bookings ?? []);
      setTotalCount(res.data.total ?? 0);
      setMessage((m) => (m.type === "error" ? { type: "", text: "" } : m));
    } else {
      setMessage({ type: "error", text: res.message });
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(loadBookings, 300);
    return () => clearTimeout(timer);
  }, [loadBookings]);

  // Hủy vé & nhả ghế (chỉ cho phép khi suất chiếu chưa diễn ra)
  async function handleCancel(b) {
    const isPaid = b.status === "PAID";
    const warnText = isPaid
      ? `Hủy đơn vé ĐÃ THANH TOÁN "${b.code}" của khách ${b.user.fullName} (${b.user.email})?\n\nToàn bộ ${b.seats.length} ghế sẽ được giải phóng ngay lập tức để người khác có thể đặt!`
      : `Hủy đơn vé "${b.code}" và giải phóng ${b.seats.length} ghế đang giữ chỗ?`;

    if (!window.confirm(warnText)) return;

    setActionLoading(b.code);
    const res = await apiRequest(`/api/staff/bookings/${b.code}/cancel`, { method: "POST" });
    setActionLoading(null);

    if (!res.ok) {
      setMessage({ type: "error", text: res.message });
      return;
    }

    setMessage({ type: "success", text: res.data?.message || `Đã hủy đơn ${b.code}` });
    loadBookings();
  }

  // Thống kê nhanh từ danh sách hiện tại
  const paidTotal = bookings
    .filter((b) => b.status === "PAID")
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const completedCount = bookings.filter(
    (b) => (b.displayStatus ?? b.status) === "COMPLETED"
  ).length;

  const inputClass = "rounded border border-neutral-700 bg-neutral-900 p-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500";

  return (
    <div className="flex flex-col gap-6">
      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
        <input
          type="text"
          placeholder="Tìm mã vé, tên, email, SĐT..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className={`${inputClass} min-w-56 flex-1`}
        />

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className={inputClass}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PAID">Đã thanh toán (Sắp chiếu)</option>
          <option value="COMPLETED">Đã hoàn thành (Đã xem xong)</option>
          <option value="PENDING">Chờ thanh toán (PENDING)</option>
          <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          <option value="EXPIRED">Hết hạn (EXPIRED)</option>
        </select>

        <select
          value={filters.cinemaId}
          onChange={(e) => setFilters({ ...filters, cinemaId: e.target.value })}
          className={inputClass}
        >
          <option value="">Tất cả rạp</option>
          {options.cinemas.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={filters.movieId}
          onChange={(e) => setFilters({ ...filters, movieId: e.target.value })}
          className={inputClass}
        >
          <option value="">Tất cả phim</option>
          {options.movies.map((m) => (
            <option key={m.id} value={m.id}>{m.title}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          className={inputClass}
        />

        {(filters.q || filters.status || filters.cinemaId || filters.movieId || filters.date) && (
          <button
            onClick={() => setFilters({ q: "", status: "", cinemaId: "", movieId: "", date: "" })}
            className="text-xs text-red-400 hover:underline"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Thông báo thao tác */}
      {message.text && (
        <div
          className={`rounded-lg p-3 text-sm border ${
            message.type === "error"
              ? "bg-red-950/60 border-red-800 text-red-300"
              : "bg-emerald-950/60 border-emerald-800 text-emerald-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Thẻ thống kê nhanh */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <span className="text-xs text-neutral-400">Tổng số đơn</span>
          <p className="mt-1 text-2xl font-black text-white">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <span className="text-xs text-neutral-400">Doanh thu vé</span>
          <p className="mt-1 text-2xl font-black text-emerald-400">{formatMoney(paidTotal)}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <span className="text-xs text-neutral-400">Đã hoàn thành</span>
          <p className="mt-1 text-2xl font-black text-blue-400">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <span className="text-xs text-neutral-400">Đơn chờ thanh toán</span>
          <p className="mt-1 text-2xl font-black text-amber-400">
            {bookings.filter((b) => b.status === "PENDING").length}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <span className="text-xs text-neutral-400">Đơn đã hủy</span>
          <p className="mt-1 text-2xl font-black text-red-400">
            {bookings.filter((b) => b.status === "CANCELLED").length}
          </p>
        </div>
      </div>

      {/* Danh sách đơn đặt vé */}
      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400">Đang tải danh sách vé...</div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 p-12 text-center text-sm text-neutral-400">
          Không tìm thấy đơn đặt vé nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((b) => {
            const currentStatus = b.displayStatus ?? b.status;
            const badge = STATUS_BADGE[currentStatus] ?? STATUS_BADGE.EXPIRED;
            const isCompleted = currentStatus === "COMPLETED";
            const isShowing = currentStatus === "SHOWING";
            const canCancel = (b.status === "PAID" || b.status === "PENDING") && !isCompleted && !isShowing;
            const isProcessing = actionLoading === b.code;

            return (
              <div
                key={b.id}
                className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                {/* Thông tin đơn vé */}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-lg font-black tracking-wider text-white">{b.code}</span>
                    <span className={`rounded border px-2 py-0.5 text-xs font-bold ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-neutral-400">
                      Tạo lúc: {formatVn(b.createdAt)}
                    </span>
                  </div>

                  {/* Khách hàng & Suất chiếu */}
                  <div className="grid gap-2 text-xs text-neutral-300 sm:grid-cols-2">
                    <div>
                      <p>
                        Khách hàng: <b className="text-white">{b.user.fullName}</b>
                      </p>
                      <p className="text-neutral-400">
                        {b.user.email} {b.user.phone ? `• ${b.user.phone}` : ""}
                      </p>
                    </div>

                    <div>
                      <p>
                        Phim: <b className="text-white">{b.showtime.movie.title}</b>
                      </p>
                      <p className="text-neutral-400">
                        {b.showtime.room.cinema.name} • {b.showtime.room.name} • {formatVn(b.showtime.startTime)}
                      </p>
                    </div>
                  </div>

                  {/* Ghế đã đặt */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-neutral-400">Ghế ({b.seats.length}):</span>
                    {b.seats.length === 0 ? (
                      <span className="text-xs italic text-neutral-500">Đã giải phóng ghế</span>
                    ) : (
                      b.seats.map((s) => (
                        <span
                          key={s.id}
                          className="rounded bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-xs font-semibold text-neutral-200"
                        >
                          {s.seat.rowLabel}{s.seat.seatNumber} ({SEAT_TYPE_LABEL[s.seat.type] ?? s.seat.type})
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Tổng tiền & Nút Thao tác */}
                <div className="flex flex-row items-center justify-between gap-4 border-t border-neutral-800 pt-3 md:flex-col md:items-end md:justify-center md:border-t-0 md:pt-0">
                  <div className="text-left md:text-right">
                    <span className="text-xs text-neutral-400">Tổng tiền</span>
                    <p className="text-xl font-black text-white">{formatMoney(b.totalAmount)}</p>
                    {b.payment && (
                      <p className="text-[11px] text-neutral-400">
                        {PAYMENT_METHODS[b.payment.method]?.label ?? b.payment.method} • {b.payment.transactionCode}
                      </p>
                    )}
                  </div>

                  {canCancel ? (
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleCancel(b)}
                      className="rounded border border-red-700 bg-red-950/60 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-900/60 hover:text-white transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? "Đang xử lý..." : "Hủy vé & Nhả ghế"}
                    </button>
                  ) : isCompleted ? (
                    <span className="rounded bg-blue-950/50 border border-blue-800/60 px-2.5 py-1 text-xs font-semibold text-blue-400">
                      ✓ Đã hoàn thành
                    </span>
                  ) : isShowing ? (
                    <span className="rounded bg-purple-950/50 border border-purple-800/60 px-2.5 py-1 text-xs font-semibold text-purple-400">
                      🎬 Đang chiếu
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
