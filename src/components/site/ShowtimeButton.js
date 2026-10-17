import Link from "next/link";
import { formatVn } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";

export default function ShowtimeButton({ showtime }) {
  const time = formatVn(showtime.startTime).slice(0, 5); // "19:30"
  const base = "flex min-w-24 flex-col items-center rounded border px-3 py-2 text-sm";

  if (showtime.available <= 0) {
    return (
      <span className={`${base} cursor-not-allowed border-neutral-800 text-neutral-600`}>
        <b className="text-base">{time}</b>
        <span className="text-xs">Hết vé</span>
      </span>
    );
  }

  return (
    <Link
      href={`/booking/${showtime.id}`}
      title={`${showtime.roomName}, còn ${showtime.available}/${showtime.total} ghế`}
      className={`${base} border-neutral-600 hover:border-red-500 hover:text-red-400`}
    >
      <b className="text-base">{time}</b>
      <span className="text-xs text-neutral-400">{formatMoney(showtime.price)}</span>
      <span className="text-xs text-neutral-500">{showtime.roomName}</span>
    </Link>
  );
}