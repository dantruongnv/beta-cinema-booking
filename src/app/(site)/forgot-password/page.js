"use client";

import { useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/clientApi";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devLink, setDevLink] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setDevLink("");
    setLoading(true);
    const result = await apiRequest("/api/auth/forgot-password", { method: "POST", body: { email } });
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    setInfo(result.data.message);
    if (result.data.devLink) setDevLink(result.data.devLink);
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Quên mật khẩu</h1>
      <p className="text-sm text-neutral-400">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border p-2 text-black"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {info && <p className="text-sm text-green-500">{info}</p>}
        {devLink && (
          <p className="break-all rounded border border-amber-600 p-2 text-xs text-amber-400">
            Chưa cấu hình email (môi trường phát triển). Dùng liên kết này:{" "}
            <a href={devLink} className="underline">{devLink}</a>
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-red-600 p-2 font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Đang gửi..." : "Gửi liên kết đặt lại mật khẩu"}
        </button>
      </form>
      <Link href="/login" className="text-sm text-red-400 underline">Quay lại đăng nhập</Link>
    </main>
  );
}