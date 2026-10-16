"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/clientApi";

const TYPE_LABEL = { NORMAL: "Thường", VIP: "VIP", COUPLE: "Đôi" };
const TYPE_CLASS = {
  NORMAL: "bg-slate-500 text-white",
  VIP: "bg-amber-500 text-black",
  COUPLE: "bg-pink-500 text-white",
};
const BTN = "rounded border px-3 py-1 disabled:opacity-40";

export default function SeatMapManager({ roomId }) {
  const [seats, setSeats] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [rowForm, setRowForm] = useState({ seatsPerRow: "10", type: "NORMAL" });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const apiUrl = `/api/staff/rooms/${roomId}/seats`;

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest(`/api/staff/rooms/${roomId}/seats`);
    if (result.ok) {
      const list = result.data.seats ?? [];
      setSeats(list);
      // Bỏ chọn những ghế không còn tồn tại (ví dụ vừa xóa)
      const ids = new Set(list.map((s) => s.id));
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
    } else {
      setMessage({ type: "error", text: result.message });
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // Gom ghế theo hàng (API đã sắp xếp theo hàng và số ghế)
  const rows = useMemo(() => {
    const map = new Map();
    for (const seat of seats) {
      if (!map.has(seat.rowLabel)) map.set(seat.rowLabel, []);
      map.get(seat.rowLabel).push(seat);
    }
    return [...map.entries()];
  }, [seats]);

  function toggleSeat(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleRow(rowSeats) {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = rowSeats.every((s) => next.has(s.id));
      for (const s of rowSeats) {
        if (allSelected) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  }

  async function runAction(call, successText) {
    setMessage({ type: "", text: "" });
    const result = await call();
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: successText });
    await load();
  }

  const ids = [...selected];

  function setType(type) {
    return runAction(
      () => apiRequest(apiUrl, { method: "PATCH", body: { seatIds: ids, type } }),
      `Đã đổi ${ids.length} ghế sang loại ${TYPE_LABEL[type]}`
    );
  }

  function setActive(isActive) {
    return runAction(
      () => apiRequest(apiUrl, { method: "PATCH", body: { seatIds: ids, isActive } }),
      isActive ? `Đã kích hoạt ${ids.length} ghế` : `Đã vô hiệu hóa ${ids.length} ghế`
    );
  }

  async function deleteSelected() {
    if (!window.confirm(`Xóa ${ids.length} ghế đã chọn? Thao tác này không thể hoàn tác.`)) return;
    await runAction(
      () => apiRequest(apiUrl, { method: "POST", body: { action: "delete", seatIds: ids } }),
      `Đã xóa ${ids.length} ghế`
    );
  }

  function addRow() {
    return runAction(
      () => apiRequest(apiUrl, { method: "POST", body: { action: "addRow", ...rowForm } }),
      "Đã thêm hàng ghế mới"
    );
  }

  function addSeat(rowLabel) {
    return runAction(
      () => apiRequest(apiUrl, { method: "POST", body: { action: "addSeat", rowLabel } }),
      `Đã thêm ghế vào hàng ${rowLabel}`
    );
  }

  const hasSelection = selected.size > 0;
  const activeCount = seats.filter((s) => s.isActive).length;
  const vipCount = seats.filter((s) => s.type === "VIP").length;
  const coupleCount = seats.filter((s) => s.type === "COUPLE").length;
  const inputClass = "rounded border p-2 text-black";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Tổng {seats.length} ghế · đang dùng {activeCount} · VIP {vipCount} · Đôi {coupleCount}
      </p>

      {message.text && (
        <p className={message.type === "error" ? "text-red-500" : "text-green-500"}>{message.text}</p>
      )}

      {/* Thanh công cụ cho các ghế đang chọn */}
      <div className="flex flex-wrap items-center gap-2 rounded border p-3 text-sm">
        <span className="font-semibold">Đã chọn {selected.size} ghế:</span>
        <button disabled={!hasSelection} onClick={() => setType("NORMAL")} className={BTN}>Đặt loại Thường</button>
        <button disabled={!hasSelection} onClick={() => setType("VIP")} className={BTN}>Đặt loại VIP</button>
        <button disabled={!hasSelection} onClick={() => setType("COUPLE")} className={BTN}>Đặt loại Đôi</button>
        <button disabled={!hasSelection} onClick={() => setActive(false)} className={BTN}>Vô hiệu hóa</button>
        <button disabled={!hasSelection} onClick={() => setActive(true)} className={BTN}>Kích hoạt</button>
        <button disabled={!hasSelection} onClick={deleteSelected} className={`${BTN} text-red-500`}>Xóa ghế đã chọn</button>
        <span className="ml-auto flex gap-2">
          <button onClick={() => setSelected(new Set(seats.map((s) => s.id)))} className={BTN}>Chọn tất cả</button>
          <button disabled={!hasSelection} onClick={() => setSelected(new Set())} className={BTN}>Bỏ chọn</button>
        </span>
      </div>

      {/* Chú thích */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-slate-500" /> Thường</span>
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-amber-500" /> VIP</span>
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-pink-500" /> Đôi</span>
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-slate-500 opacity-30" /> Vô hiệu hóa</span>
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-slate-500 ring-2 ring-blue-400" /> Đang chọn</span>
      </div>

      {/* Sơ đồ ghế */}
      <div className="overflow-x-auto rounded border p-4">
        <div className="mx-auto mb-6 w-2/3 min-w-48 rounded bg-gray-300 py-1 text-center text-xs font-semibold text-black">
          MÀN HÌNH
        </div>
        <div className="flex w-max min-w-full flex-col items-center gap-2">
          {rows.map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-1">
              <button
                onClick={() => toggleRow(rowSeats)}
                className="w-6 text-sm font-bold underline"
                title="Chọn / bỏ chọn cả hàng"
              >
                {rowLabel}
              </button>
              {rowSeats.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => toggleSeat(seat.id)}
                  title={`${seat.rowLabel}${seat.seatNumber} - ${TYPE_LABEL[seat.type]}${seat.isActive ? "" : " (đã vô hiệu hóa)"}${seat._count.bookingSeats > 0 ? " - đã có vé đặt" : ""}`}
                  className={[
                    "h-8 rounded text-[10px] font-semibold",
                    seat.type === "COUPLE" ? "w-14" : "w-8",
                    TYPE_CLASS[seat.type],
                    seat.isActive ? "" : "line-through opacity-30",
                    selected.has(seat.id) ? "ring-2 ring-blue-400 ring-offset-1" : "",
                  ].join(" ")}
                >
                  {seat.seatNumber}
                </button>
              ))}
              <button
                onClick={() => addSeat(rowLabel)}
                className="ml-1 h-8 w-8 rounded border text-sm"
                title="Thêm một ghế vào cuối hàng"
              >
                +
              </button>
            </div>
          ))}
        </div>
        {loading && <p className="mt-4 text-center text-sm">Đang tải...</p>}
        {!loading && rows.length === 0 && (
          <p className="mt-4 text-center text-sm">Phòng chưa có ghế. Hãy thêm hàng ghế bên dưới.</p>
        )}
      </div>

      {/* Thêm hàng mới */}
      <div className="flex flex-wrap items-end gap-3 rounded border p-3 text-sm">
        <label className="flex flex-col gap-1">
          Số ghế của hàng mới (1-20)
          <input
            type="number"
            min="1"
            max="20"
            value={rowForm.seatsPerRow}
            onChange={(e) => setRowForm({ ...rowForm, seatsPerRow: e.target.value })}
            className={`${inputClass} w-32`}
          />
        </label>
        <label className="flex flex-col gap-1">
          Loại ghế
          <select
            value={rowForm.type}
            onChange={(e) => setRowForm({ ...rowForm, type: e.target.value })}
            className={inputClass}
          >
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button onClick={addRow} className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          + Thêm hàng
        </button>
        <p className="text-xs">Hàng mới nhận mã chữ cái kế tiếp (sau hàng H là hàng I).</p>
      </div>
    </div>
  );
}