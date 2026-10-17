"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/clientApi";

export default function HoldControls({ code, expiresAt, showtimeId }) {
  const router = useRouter();
  const [left, setLeft] = useState(null); // số giây còn lại
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tick = () =>
      setLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [expiresAt]);

  // Hết giờ: tải lại để trang hiện trạng thái hết hạn từ server
  useEffect(() => {
    if (left === 0) router.refresh();
  }, [left, router]);

  async function cancel() {
    if (!window.confirm("Hủy đơn và nhả ghế đang giữ?")) return;
    setBusy(true);
    const result = await apiRequest(`/api/bookings/${code}/cancel`, { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/booking/${showtimeId}`);
    router.refresh();
  }

  const mm = left === null ? "--" : String(Math.floor(left / 60)).padStart(2, "0");
  const ss = left === null ? "--" : String(left % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        Thời gian giữ ghế còn lại:{" "}
        <b className="text-2xl text-red-400">{mm}:{ss}</b>
      </p>
      <div>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="rounded border border-neutral-600 px-4 py-2 text-sm hover:border-red-500 disabled:opacity-50"
        >
          Hủy đơn và chọn lại ghế
        </button>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}