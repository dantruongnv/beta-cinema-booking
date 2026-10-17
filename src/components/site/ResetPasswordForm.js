"use client";

import { useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/clientApi";

export default function ResetPasswordForm({ token }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    setLoading(true);
    const result = await apiRequest("/api/auth/reset-password", { method: "POST", body: { token, password } });
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Đã đặt lại mật khẩu</h1>
        <p className="text-sm text-neutral-400">Bạn có thể đăng nhập bằng mật khẩu mới.</p>
        <Link href="/login" className="rounded bg-red-600 p-2 font-semibold text-white">Đăng nhập</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Đặt lại mật khẩu</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="Mật khẩu mới (tối thiểu 8 ký tự, có chữ và số)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded border p-2 text-black"
        />
        <input
          type="password"
          placeholder="Nhập lại mật khẩu mới"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="rounded border p-2 text-black"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-red-600 p-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>
      </form>
    </main>
  );
}