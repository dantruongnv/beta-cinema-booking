"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/clientApi";
import { formatVn } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { seatPrice, SEAT_TYPE_LABEL } from "@/lib/pricing";
import { MAX_SEATS_PER_BOOKING } from "@/lib/constants";

const TYPE_CLASS = {
  NORMAL: "bg-slate-500 text-white hover:bg-slate-400",
  VIP: "bg-amber-500 text-black hover:bg-amber-400",
  COUPLE: "bg-pink-500 text-white hover:bg-pink-400",
};

export default function SeatPicker({ showtime, seats, takenIds, ownHold }) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const taken = useMemo(() => new Set(takenIds), [takenIds]);

  const rows = useMemo(() => {
    const map = new Map();
    for (const seat of seats) {
      if (!map.has(seat.rowLabel)) map.set(seat.rowLabel, []);
      map.get(seat.rowLabel).push(seat);
    }
    return [...map.entries()];
  }, [seats]);

  // Ghế đang chọn (bỏ những ghế vừa bị người khác lấy)
  const chosen = seats.filter((s) => selected.has(s.id) && !taken.has(s.id));
  const total = chosen.reduce((sum, s) => sum + seatPrice(showtime.price, s.type), 0);

  function toggle(seat) {
    if (taken.has(seat.id)) return;
    const next = new Set(selected);
    if (next.has(seat.id)) {
      next.delete(seat.id);
    } else {
      if (chosen.length >= MAX_SEATS_PER_BOOKING) {
        setMessage(`Mỗi đơn tối đa ${MAX_SEATS_PER_BOOKING} ghế`);
        return;
      }
      next.add(seat.id);
    }
    setMessage("");
    setSelected(next);
  }

  async function holdSeats() {
    setBusy(true);
    setMessage("");
    const result = await apiRequest("/api/bookings", {
      method: "POST",
      body: { showtimeId: showtime.id, seatIds: chosen.map((s) => s.id) },
    });
    setBusy(false);

    if (!result.ok) {
      setMessage(result.message);
      router.refresh(); // tải lại tình trạng ghế mới nhất
      return;
    }
    router.push(`/checkout/${result.data.booking.code}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-neutral-800 p-4">
        <h1 className="text-xl font-bold">{showtime.movieTitle}</h1>
        <p className="text-sm text-neutral-300">
          {showtime.cinemaName}, {showtime.roomName}
        </p>
        <p className="text-sm text-neutral-400">
          Suất chiếu {formatVn(showtime.startTime)}. Giá vé từ {formatMoney(showtime.price)}
        </p>
      </div>

      {ownHold && (
        <p className="rounded border border-amber-600 p-3 text-sm text-amber-400">
          Bạn đang giữ ghế ở đơn {ownHold.code}.{" "}
          <Link href={`/checkout/${ownHold.code}`} className="underline">Tiếp tục thanh toán</Link>. Nếu chọn lại ghế
          bên dưới, đơn cũ sẽ được thay thế.
        </p>
      )}

      {/* Chú thích */}
      <div className="flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-slate-500" /> Thường</span>
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-amber-500" /> VIP</span>
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-pink-500" /> Đôi</span>
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-red-600 ring-2 ring-white" /> Đang chọn</span>
        <span className="flex items-center gap-1"><i className="inline-block h-4 w-4 rounded bg-neutral-800" /> Đã có người đặt</span>
      </div>

      {/* Sơ đồ ghế */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800 p-4">
        <div className="mx-auto mb-6 w-2/3 min-w-48 rounded bg-gray-300 py-1 text-center text-xs font-semibold text-black">
          MÀN HÌNH
        </div>
        <div className="flex w-max min-w-full flex-col items-center gap-2">
          {rows.map(([rowLabel, rowSeats]) => (
            <div key={rowLabel} className="flex items-center gap-1">
              <span className="w-6 text-sm font-bold">{rowLabel}</span>
              {rowSeats.map((seat) => {
                const isTaken = taken.has(seat.id);
                const isSelected = selected.has(seat.id) && !isTaken;
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={isTaken}
                    onClick={() => toggle(seat)}
                    aria-pressed={isSelected}
                    aria-label={`Ghế ${seat.rowLabel}${seat.seatNumber}, ${SEAT_TYPE_LABEL[seat.type]}${isTaken ? ", đã có người đặt" : ""}`}
                    title={`${seat.rowLabel}${seat.seatNumber} (${SEAT_TYPE_LABEL[seat.type]}): ${formatMoney(seatPrice(showtime.price, seat.type))}`}
                    className={[
                      "h-8 rounded text-[10px] font-semibold",
                      seat.type === "COUPLE" ? "w-14" : "w-8",
                      isTaken
                        ? "cursor-not-allowed bg-neutral-800 text-neutral-600 line-through"
                        : isSelected
                          ? "bg-red-600 text-white ring-2 ring-white"
                          : TYPE_CLASS[seat.type],
                    ].join(" ")}
                  >
                    {seat.seatNumber}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {rows.length === 0 && <p className="text-center text-sm text-neutral-400">Phòng chưa có ghế.</p>}
      </div>

      {/* Tóm tắt */}
      <div className="rounded-lg border border-neutral-800 p-4">
        <h2 className="mb-2 font-semibold">Ghế đã chọn ({chosen.length}/{MAX_SEATS_PER_BOOKING})</h2>
        {chosen.length === 0 ? (
          <p className="text-sm text-neutral-400">Bấm vào ghế trống để chọn.</p>
        ) : (
          <ul className="mb-3 flex flex-col gap-1 text-sm">
            {chosen.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.rowLabel}{s.seatNumber} ({SEAT_TYPE_LABEL[s.type]})</span>
                <span>{formatMoney(seatPrice(showtime.price, s.type))}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="flex justify-between border-t border-neutral-800 pt-3 text-lg font-bold">
          <span>Tổng tiền</span>
          <span>{formatMoney(total)}</span>
        </p>
        {message && <p className="mt-2 text-sm text-red-500">{message}</p>}
        <button
          type="button"
          onClick={holdSeats}
          disabled={chosen.length === 0 || busy}
          className="mt-3 w-full rounded bg-red-600 py-3 font-semibold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? "Đang giữ ghế..." : "Giữ ghế và thanh toán"}
        </button>
        <p className="mt-2 text-xs text-neutral-400">Ghế được giữ trong 10 phút để bạn hoàn tất thanh toán.</p>
      </div>
    </div>
  );
}