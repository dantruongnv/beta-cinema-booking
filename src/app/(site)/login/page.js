"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/clientApi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [devLink, setDevLink] = useState("");
  const [notVerified, setNotVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setDevLink("");
    setNotVerified(false);
    setLoading(true);

    const result = await apiRequest("/api/auth/login", { method: "POST", body: { email, password } });
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      setNotVerified(result.data?.code === "NOT_VERIFIED");
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
    router.push(safeNext ?? (result.data.user.role === "STAFF" ? "/staff" : "/"));
    router.refresh();
  }

  async function resend() {
    setInfo("");
    setDevLink("");
    const result = await apiRequest("/api/auth/resend-verification", { method: "POST", body: { email } });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setInfo(result.data.message);
    if (result.data.devLink) setDevLink(result.data.devLink);
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">Đăng nhập</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border p-2 text-black"
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded border p-2 text-black"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {notVerified && (
          <button type="button" onClick={resend} className="text-left text-sm text-red-400 underline">
            Gửi lại email xác nhận
          </button>
        )}
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
          {loading ? "Đang xử lý..." : "Đăng nhập"}
        </button>
      </form>
      <p className="text-sm">
        <Link href="/forgot-password" className="text-red-400 underline">Quên mật khẩu?</Link>
      </p>
      <p className="text-sm">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="text-red-400 underline">Đăng ký</Link>
      </p>
    </main>
  );
}