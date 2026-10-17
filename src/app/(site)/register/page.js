"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Đăng ký thất bại");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Không kết nối được máy chủ");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "rounded border p-2 text-black";

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
        <Link href="/login" className="text-red-400 underline">
          Đăng nhập
        </Link>
      </p>
    </main>
  );
}