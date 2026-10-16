"use client";

import { useCallback, useEffect, useState } from "react";

const EMPTY_FORM = { name: "", address: "", region: "", phone: "" };

export default function CinemaManager() {
  const [cinemas, setCinemas] = useState([]);
  const [regions, setRegions] = useState([]);
  const [filters, setFilters] = useState({ q: "", region: "", status: "all" });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = đang thêm mới
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.region) params.set("region", filters.region);
      if (filters.status !== "all") params.set("status", filters.status);

      const res = await fetch(`/api/staff/cinemas?${params.toString()}`);
      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("Phản hồi không phải JSON:", res.status, text.slice(0, 300));
        setMessage({ type: "error", text: `Máy chủ trả về mã ${res.status} (không phải JSON)` });
        return;
      }

      if (!res.ok) {
        setMessage({ type: "error", text: data.message || `Lỗi ${res.status}` });
        return;
      }

      setCinemas(data.cinemas ?? []);
      setRegions(data.regions ?? []);
      // Xóa thông báo lỗi cũ khi tải thành công
      setMessage((m) => (m.type === "error" ? { type: "", text: "" } : m));
    } catch (err) {
      console.error("Lỗi tải danh sách rạp:", err);
      setMessage({ type: "error", text: `Lỗi: ${err.message}` });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Chờ 300ms sau khi ngừng gõ rồi mới tải, tránh gọi API sau mỗi phím
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  function openEdit(cinema) {
    setEditingId(cinema.id);
    setForm({
      name: cinema.name,
      address: cinema.address,
      region: cinema.region,
      phone: cinema.phone ?? "",
    });
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function callApi(url, method, body) {
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "Thao tác thất bại" });
        return false;
      }
      return true;
    } catch {
      setMessage({ type: "error", text: "Không kết nối được máy chủ" });
      return false;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const url = editingId ? `/api/staff/cinemas/${editingId}` : "/api/staff/cinemas";
    const ok = await callApi(url, editingId ? "PATCH" : "POST", form);
    if (ok) {
      setMessage({ type: "success", text: editingId ? "Đã cập nhật rạp" : "Đã thêm rạp mới" });
      closeForm();
      load();
    }
  }

  async function toggleActive(cinema) {
    const ok = await callApi(`/api/staff/cinemas/${cinema.id}`, "PATCH", { isActive: !cinema.isActive });
    if (ok) {
      setMessage({ type: "success", text: cinema.isActive ? "Đã ẩn rạp" : "Đã hiện rạp" });
      load();
    }
  }

  async function handleDelete(cinema) {
    if (!window.confirm(`Xóa rạp "${cinema.name}"? Thao tác này không thể hoàn tác.`)) return;
    const ok = await callApi(`/api/staff/cinemas/${cinema.id}`, "DELETE");
    if (ok) {
      setMessage({ type: "success", text: "Đã xóa rạp" });
      load();
    }
  }

  const inputClass = "rounded border p-2 text-black";

  return (
    <div className="flex flex-col gap-4">
      {/* Bộ lọc */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          placeholder="Tìm theo tên hoặc địa chỉ..."
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          className={`${inputClass} w-64`}
        />
        <select
          value={filters.region}
          onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          className={inputClass}
        >
          <option value="">Tất cả khu vực</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className={inputClass}
        >
          <option value="all">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã ẩn</option>
        </select>
        <button onClick={openCreate} className="ml-auto rounded bg-blue-600 px-4 py-2 font-semibold text-white">
          + Thêm rạp
        </button>
      </div>

      {message.text && (
        <p className={message.type === "error" ? "text-red-500" : "text-green-500"}>{message.text}</p>
      )}

      {/* Form thêm/sửa */}
      {showForm && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border p-4">
          <h2 className="font-semibold">{editingId ? "Sửa thông tin rạp" : "Thêm rạp mới"}</h2>
          <input placeholder="Tên rạp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={inputClass} />
          <input placeholder="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className={inputClass} />
          <input list="region-list" placeholder="Khu vực (ví dụ: Hà Nội)" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} required className={inputClass} />
          <datalist id="region-list">
            {regions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <input placeholder="Số điện thoại (không bắt buộc)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
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
              <th className="p-2">Tên rạp</th>
              <th className="p-2">Địa chỉ</th>
              <th className="p-2">Khu vực</th>
              <th className="p-2">SĐT</th>
              <th className="p-2">Số phòng</th>
              <th className="p-2">Trạng thái</th>
              <th className="p-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {cinemas.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2 font-medium">{c.name}</td>
                <td className="p-2">{c.address}</td>
                <td className="p-2">{c.region}</td>
                <td className="p-2">{c.phone ?? "-"}</td>
                <td className="p-2">{c._count.rooms}</td>
                <td className="p-2">{c.isActive ? "Hoạt động" : "Đã ẩn"}</td>
                <td className="flex gap-2 p-2">
                  <button onClick={() => openEdit(c)} className="underline">Sửa</button>
                  <button onClick={() => toggleActive(c)} className="underline">{c.isActive ? "Ẩn" : "Hiện"}</button>
                  <button onClick={() => handleDelete(c)} className="text-red-500 underline">Xóa</button>
                </td>
              </tr>
            ))}
            {!loading && cinemas.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center">Không có rạp nào</td>
              </tr>
            )}
          </tbody>
        </table>
        {loading && <p className="p-2 text-sm">Đang tải...</p>}
      </div>
    </div>
  );
}