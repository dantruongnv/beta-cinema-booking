import Link from "next/link";
import Poster from "@/components/site/Poster";
import { formatVn } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

export default function BookingCard({ booking, href, badge }) {
  const { showtime } = booking;
  const seatText = [...booking.seats]
    .sort((a, b) => a.seat.rowLabel.localeCompare(b.seat.rowLabel) || a.seat.seatNumber - b.seat.seatNumber)
    .map((s) => `${s.seat.rowLabel}${s.seat.seatNumber}`)
    .join(", ");

  return (
    <Link
      href={href}
      className="flex gap-4 rounded-lg border border-neutral-800 p-4 hover:border-red-500"
    >
      <Poster src={showtime.movie.posterUrl} alt={showtime.movie.title} className="aspect-[2/3] w-16 shrink-0 rounded" />
      <div className="flex flex-1 flex-col gap-1 text-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{showtime.movie.title}</h3>
          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold text-white ${badge.className}`}>
            {badge.text}
          </span>
        </div>
        <p className="text-neutral-300">
          {showtime.room.cinema.name}, {showtime.room.name}
        </p>
        <p className="text-neutral-400">Suất chiếu {formatVn(showtime.startTime)}</p>
        <p className="text-neutral-400">
          {seatText ? `Ghế ${seatText}. ` : ""}
          Tổng {formatMoney(booking.totalAmount)}
        </p>
        <p className="text-xs text-neutral-500">Mã đơn {booking.code}</p>
      </div>
    </Link>
  );
}