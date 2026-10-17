"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/clientApi";

export default function GatewaySimulator({ code, method }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(outcome) {
    setBusy(true);
    setMessage("");
    const result = await apiRequest(`/api/bookings/${code}/pay`, {
      method: "POST",
      body: { method, outcome },
    });
    setBusy(false);

    if (!result.ok) {
      setMessage(result.message);
      router.refresh(); // nếu đơn đã hết hạn, trang sẽ chuyển sang thông báo tương ứng
      return;
    }
    if (outcome === "SUCCESS") {
      router.push(`/tickets/${code}`);
      return;
    }
    setMessage("Thanh toán không thành công (mô phỏng). Bạn có thể thử lại hoặc chọn phương thức khác.");
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => submit("SUCCESS")}
        disabled={busy}
        className="rounded bg-red-600 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
      >
        {busy ? "Đang xử lý..." : "Xác nhận thanh toán"}
      </button>
      <button
        type="button"
        onClick={() => submit("FAILED")}
        disabled={busy}
        className="rounded border border-neutral-600 py-3 text-sm hover:border-red-500 disabled:opacity-50"
      >
        Mô phỏng thanh toán thất bại
      </button>
      <Link href={`/checkout/${code}`} className="text-center text-sm text-red-400 hover:underline">
        Chọn phương thức khác
      </Link>
      {message && <p className="text-sm text-red-500">{message}</p>}
    </div>
  );
}