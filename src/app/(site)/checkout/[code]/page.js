import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { releaseExpiredBookings } from "@/lib/bookings";
import { formatVn } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { SEAT_TYPE_LABEL } from "@/lib/pricing";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";
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
      payment: true,
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

      <div className="rounded-lg border border-neutral-800 p-4">
        <h2 className="mb-3 font-semibold">Phương thức thanh toán</h2>
        {booking.payment?.status === "FAILED" && (
          <p className="mb-3 text-sm text-red-500">Lần thanh toán trước không thành công. Bạn có thể thử lại.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(PAYMENT_METHODS).map(([key, m]) => (
            <Link
              key={key}
              href={`/checkout/${booking.code}/pay?method=${key}`}
              className="rounded border border-neutral-700 p-3 hover:border-red-500"
            >
              <b>{m.label}</b>
              <p className="text-xs text-neutral-400">{m.description}</p>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Thanh toán trong hệ thống này là mô phỏng cho mục đích học tập, không phát sinh giao dịch thật.
        </p>
      </div>
    </div>
  );
}