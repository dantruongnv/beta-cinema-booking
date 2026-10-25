import Link from "next/link";
import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatVn } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { SEAT_TYPE_LABEL } from "@/lib/pricing";
import { PAYMENT_METHODS } from "@/lib/paymentMethods";
import Poster from "@/components/site/Poster";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vé của tôi - Beta Cinemas" };

export default async function TicketPage({ params }) {
  const code = String((await params).code ?? "").toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/tickets/${code}`)}`);

  const booking = await prisma.booking.findFirst({
    where: { code, userId: user.id },
    include: {
      payment: true,
      showtime: {
        include: {
          movie: { select: { title: true, posterUrl: true, durationMin: true } },
          room: { select: { name: true, cinema: { select: { name: true, address: true } } } },
        },
      },
      seats: { include: { seat: { select: { rowLabel: true, seatNumber: true, type: true } } } },
    },
  });
  if (!booking) notFound();

  if (booking.status === "PENDING") redirect(`/checkout/${booking.code}`);

  if (booking.status !== "PAID") {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="mb-2 text-2xl font-bold">
          {booking.status === "EXPIRED" ? "Đơn đã hết hạn giữ ghế" : "Đơn đã được hủy"}
        </h1>
        <Link href="/tickets" className="text-red-400 hover:underline">Về danh sách vé của tôi</Link>
      </div>
    );
  }

  const { showtime, payment } = booking;
  const seats = [...booking.seats].sort(
    (a, b) => a.seat.rowLabel.localeCompare(b.seat.rowLabel) || a.seat.seatNumber - b.seat.seatNumber
  );
  const qr = await QRCode.toDataURL(booking.code, { margin: 1, width: 240 });
  const now = Date.now();
  const isCompleted = showtime.endTime.getTime() <= now;
  const isShowing = !isCompleted && showtime.startTime.getTime() <= now;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/tickets" className="text-sm text-red-400 hover:underline">← Vé của tôi</Link>
        <h1 className="mt-2 text-2xl font-bold">Vé xem phim</h1>
      </div>

      <div className="flex flex-col gap-6 rounded-xl border border-neutral-700 bg-neutral-900 p-6 md:flex-row">
        <Poster
          src={showtime.movie.posterUrl}
          alt={showtime.movie.title}
          className="aspect-[2/3] w-32 shrink-0 self-center rounded-lg md:self-start"
        />

        <div className="flex flex-1 flex-col gap-2 text-sm">
          <h2 className="text-xl font-bold">{showtime.movie.title}</h2>
          <p className="text-neutral-300">
            {showtime.room.cinema.name}, {showtime.room.name}
          </p>
          <p className="text-xs text-neutral-400">{showtime.room.cinema.address}</p>
          <p className="mt-1">
            Suất chiếu <b>{formatVn(showtime.startTime)}</b>
            {isCompleted && (
              <span className="ml-2 rounded bg-blue-900/80 text-blue-200 border border-blue-700/60 px-2 py-0.5 text-xs">
                Đã hoàn thành
              </span>
            )}
            {isShowing && (
              <span className="ml-2 rounded bg-purple-900/80 text-purple-200 border border-purple-700/60 px-2 py-0.5 text-xs">
                Đang chiếu
              </span>
            )}
          </p>

          <div className="mt-2">
            <p className="font-semibold">Ghế</p>
            <ul className="mt-1 flex flex-col gap-1">
              {seats.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.seat.rowLabel}{s.seat.seatNumber} ({SEAT_TYPE_LABEL[s.seat.type]})</span>
                  <span>{formatMoney(s.price)}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="flex justify-between border-t border-neutral-700 pt-2 text-base font-bold">
            <span>Tổng tiền</span>
            <span>{formatMoney(booking.totalAmount)}</span>
          </p>

          {payment && (
            <p className="text-xs text-neutral-400">
              Thanh toán bằng {PAYMENT_METHODS[payment.method]?.label ?? payment.method}, mã giao dịch{" "}
              {payment.transactionCode}.
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`Mã QR của vé ${booking.code}`} className="h-44 w-44 rounded bg-white p-2" />
          <p className="text-xs text-neutral-400">Mã đặt vé</p>
          <p className="text-lg font-bold tracking-wider">{booking.code}</p>
        </div>
      </div>

      <p className="text-xs text-neutral-500">
        Đưa mã QR hoặc mã đặt vé cho nhân viên tại rạp. Đây là vé của hệ thống học tập, không dùng được tại rạp thật.
      </p>
    </div>
  );
}
