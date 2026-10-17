import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { releaseExpiredBookings } from "@/lib/bookings";
import { formatVn } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { SEAT_TYPE_LABEL } from "@/lib/pricing";
import HoldControls from "@/components/site/HoldControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đơn đặt vé - Beta Cinemas" };

export default async function CheckoutPage({ params }) {
  const code = String((await params).code ?? "").toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/${code}`)}`);

  await releaseExpiredBookings();

  const booking = await prisma.booking.findFirst({
    where: { code, userId: user.id },
    include: {
      showtime: {
        include: {
          movie: { select: { title: true } },
          room: { select: { name: true, cinema: { select: { name: true, address: true } } } },
        },
      },
      seats: { include: { seat: { select: { rowLabel: true, seatNumber: true, type: true } } } },
    },
  });
  if (!booking) notFound();

  // Đơn đã thanh toán: sang trang vé (làm ở bước 8B)
  if (booking.status === "PAID") redirect(`/tickets/${booking.code}`);

  if (booking.status !== "PENDING") {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 text-2xl font-bold">
          {booking.status === "EXPIRED" ? "Đơn đã hết hạn giữ ghế" : "Đơn đã được hủy"}
        </h1>
        <p className="mb-6 text-neutral-400">Các ghế đã được nhả. Bạn có thể chọn lại ghế cho suất chiếu này.</p>
        <Link
          href={`/booking/${booking.showtimeId}`}
          className="inline-block rounded bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500"
        >
          Chọn lại ghế
        </Link>
      </div>
    );
  }

  const seats = [...booking.seats].sort(
    (a, b) => a.seat.rowLabel.localeCompare(b.seat.rowLabel) || a.seat.seatNumber - b.seat.seatNumber
  );
  const { showtime } = booking;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Đơn đặt vé {booking.code}</h1>

      <div className="rounded-lg border border-neutral-800 p-4">
        <h2 className="text-lg font-semibold">{showtime.movie.title}</h2>
        <p className="text-sm text-neutral-300">
          {showtime.room.cinema.name}, {showtime.room.name}
        </p>
        <p className="text-xs text-neutral-400">{showtime.room.cinema.address}</p>
        <p className="mt-1 text-sm">Suất chiếu {formatVn(showtime.startTime)}</p>
      </div>

      <div className="rounded-lg border border-neutral-800 p-4">
        <h2 className="mb-2 font-semibold">Ghế đã chọn</h2>
        <ul className="mb-3 flex flex-col gap-1 text-sm">
          {seats.map((s) => (
            <li key={s.id} className="flex justify-between">
              <span>{s.seat.rowLabel}{s.seat.seatNumber} ({SEAT_TYPE_LABEL[s.seat.type]})</span>
              <span>{formatMoney(s.price)}</span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t border-neutral-800 pt-3 text-lg font-bold">
          <span>Tổng tiền</span>
          <span>{formatMoney(booking.totalAmount)}</span>
        </p>
      </div>

      <HoldControls code={booking.code} expiresAt={booking.expiresAt.toISOString()} showtimeId={booking.showtimeId} />

      {/* Phương thức thanh toán sẽ được thêm ở bước 8B */}
      <div className="rounded-lg border border-dashed border-neutral-700 p-4 text-sm text-neutral-400">
        Phần chọn phương thức thanh toán (Momo, VNPay, ATM, Visa) sẽ được thêm ở bước tiếp theo.
      </div>
    </div>
  );
}