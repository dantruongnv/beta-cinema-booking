"use client";

import { useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/clientApi";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // kết quả đăng ký thành công

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    const result = await apiRequest("/api/auth/register", {
      method: "POST",
      body: { fullName: form.fullName, email: form.email, phone: form.phone, password: form.password },
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    setDone({
      email: form.email,
      emailFailed: result.data.emailFailed,
      devLink: result.data.devLink,
      next: next && next.startsWith("/") && !next.startsWith("//") ? next : null,
    });
  }

  const inputClass = "rounded border p-2 text-black";

  if (done) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 p-6">
        <h1 className="text-2xl font-bold">Kiểm tra email của bạn</h1>
        {done.emailFailed ? (
          <p className="text-sm text-amber-400">
            Tài khoản đã được tạo nhưng chưa gửi được email xác nhận. Hãy vào trang đăng nhập và chọn
            &quot;Gửi lại email xác nhận&quot;.
          </p>
        ) : (
          <p className="text-sm">
            Chúng tôi đã gửi email xác nhận tới <b>{done.email}</b>. Hãy mở liên kết trong email (có hiệu lực 24
            giờ) rồi đăng nhập.
          </p>
        )}
        {done.devLink && (
          <p className="break-all rounded border border-amber-600 p-2 text-xs text-amber-400">
            Chưa cấu hình email (môi trường phát triển). Dùng liên kết này:{" "}
            <a href={done.devLink} className="underline">{done.devLink}</a>
          </p>
        )}
        <Link
          href={done.next ? `/login?next=${encodeURIComponent(done.next)}` : "/login"}
          className="rounded bg-red-600 p-2 text-center font-semibold text-white"
        >
          Đến trang đăng nhập
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Đăng ký</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input placeholder="Họ và tên" value={form.fullName} onChange={update("fullName")} required className={inputClass} />
        <input type="email" placeholder="Email" value={form.email} onChange={update("email")} required className={inputClass} />
        <input placeholder="Số điện thoại (không bắt buộc)" value={form.phone} onChange={update("phone")} className={inputClass} />
        <input type="password" placeholder="Mật khẩu (tối thiểu 8 ký tự, có chữ và số)" value={form.password} onChange={update("password")} required className={inputClass} />
        <input type="password" placeholder="Nhập lại mật khẩu" value={form.confirmPassword} onChange={update("confirmPassword")} required className={inputClass} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-red-600 p-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Đăng ký"}
        </button>
      </form>
      <p className="text-sm">
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-red-400 underline">Đăng nhập</Link>
      </p>
    </main>
  );
}