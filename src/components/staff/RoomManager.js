"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/clientApi";

const EMPTY_FORM = { name: "", rows: "8", seatsPerRow: "10", vipRows: "2" };

export default function RoomManager({ cinemaId }) {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = đang thêm mới
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiRequest(`/api/staff/cinemas/${cinemaId}/rooms`);
    if (result.ok) {
      setRooms(result.data.rooms ?? []);
      setMessage((m) => (m.type === "error" ? { type: "", text: "" } : m));
    } else {
      setMessage({ type: "error", text: result.message });
    }
    setLoading(false);
  }, [cinemaId]);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  function openEdit(room) {
    setEditingId(room.id);
    setForm({ ...EMPTY_FORM, name: room.name });
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    const result = editingId
      ? await apiRequest(`/api/staff/rooms/${editingId}`, { method: "PATCH", body: { name: form.name } })
      : await apiRequest(`/api/staff/cinemas/${cinemaId}/rooms`, { method: "POST", body: form });

    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: editingId ? "Đã cập nhật phòng" : "Đã thêm phòng mới" });
    closeForm();
    load();
  }

  async function toggleActive(room) {
    const result = await apiRequest(`/api/staff/rooms/${room.id}`, {
      method: "PATCH",
      body: { isActive: !room.isActive },
    });
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: room.isActive ? "Đã ẩn phòng" : "Đã hiện phòng" });
    load();
  }

  async function handleDelete(room) {
    if (!window.confirm(`Xóa "${room.name}" cùng ${room._count.seats} ghế? Thao tác này không thể hoàn tác.`)) return;
    const result = await apiRequest(`/api/staff/rooms/${room.id}`, { method: "DELETE" });
    if (!result.ok) {
      setMessage({ type: "error", text: result.message });
      return;
    }
    setMessage({ type: "success", text: "Đã xóa phòng" });
    load();
  }

  const inputClass = "rounded border p-2 text-black";
  const totalSeats = Number(form.rows) * Number(form.seatsPerRow);
  const vipSeats = Number(form.vipRows) * Number(form.seatsPerRow);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex">
        <button onClick={openCreate} className="ml-auto rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          + Thêm phòng
        </button>
      </div>

      {message.text && (
        <p className={message.type === "error" ? "text-red-500" : "text-green-500"}>{message.text}</p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border p-4">
          <h2 className="font-semibold">{editingId ? "Sửa tên phòng" : "Thêm phòng mới"}</h2>
          <input
            placeholder="Tên phòng (ví dụ: Phòng 3)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className={inputClass}
          />

          {!editingId && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  Số hàng ghế (1-20)
                  <input type="number" min="1" max="20" value={form.rows} onChange={(e) => setForm({ ...form, rows: e.target.value })} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Số ghế mỗi hàng (1-20)
                  <input type="number" min="1" max="20" value={form.seatsPerRow} onChange={(e) => setForm({ ...form, seatsPerRow: e.target.value })} required className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Số hàng VIP (cuối phòng)
                  <input type="number" min="0" value={form.vipRows} onChange={(e) => setForm({ ...form, vipRows: e.target.value })} className={inputClass} />
                </label>
              </div>
              {totalSeats > 0 && (
                <p className="text-sm">
                  Sẽ tạo {totalSeats} ghế (hàng A đến {String.fromCharCode(64 + Number(form.rows) || 65)}), trong đó {vipSeats || 0} ghế VIP.
                </p>
              )}
            </>
          )}

          {editingId && <p className="text-sm">Sơ đồ ghế của phòng được chỉnh riêng ở phần quản lý ghế (bước 4C).</p>}

          <div className="flex gap-2">
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Lưu</button>
            <button type="button" onClick={closeForm} className="rounded border px-4 py-2">Hủy</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2">Tên phòng</th>
              <th className="p-2">Số ghế</th>
              <th className="p-2">Số suất chiếu</th>
              <th className="p-2">Trạng thái</th>
              <th className="p-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2 font-medium">{r.name}</td>
                <td className="p-2">{r._count.seats}</td>
                <td className="p-2">{r._count.showtimes}</td>
                <td className="p-2">{r.isActive ? "Hoạt động" : "Đã ẩn"}</td>
                <td className="flex gap-2 p-2">
                  <button onClick={() => openEdit(r)} className="underline">Sửa tên</button>
                  <button onClick={() => toggleActive(r)} className="underline">{r.isActive ? "Ẩn" : "Hiện"}</button>
                  <button onClick={() => handleDelete(r)} className="text-red-500 underline">Xóa</button>
                </td>
              </tr>
            ))}
            {!loading && rooms.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center">Rạp này chưa có phòng chiếu nào</td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className="p-2 text-sm">Đang tải...</p>}
      </div>
    </div>
  );
}