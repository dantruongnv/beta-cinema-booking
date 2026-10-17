import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { releaseExpiredBookings } from "@/lib/bookings";
import { formatVn } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { PAYMENT_METHODS, isPaymentMethod } from "@/lib/paymentMethods";
import HoldControls from "@/components/site/HoldControls";
import GatewaySimulator from "@/components/site/GatewaySimulator";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thanh toán - Beta Cinemas" };

export default async function PayPage({ params, searchParams }) {
  const code = String((await params).code ?? "").toUpperCase();
  const sp = await searchParams;
  const method = String(sp.method ?? "").toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/${code}`)}`);
  if (!isPaymentMethod(method)) redirect(`/checkout/${code}`);

  await releaseExpiredBookings();

  const booking = await prisma.booking.findFirst({
    where: { code, userId: user.id },
    include: {
      showtime: {
        include: {
          movie: { select: { title: true } },
          room: { select: { name: true, cinema: { select: { name: true } } } },
        },
      },
      seats: { include: { seat: { select: { rowLabel: true, seatNumber: true } } } },
    },
  });
  if (!booking) notFound();
  if (booking.status === "PAID") redirect(`/tickets/${booking.code}`);
  if (booking.status !== "PENDING") redirect(`/checkout/${booking.code}`); // trang đơn sẽ báo hết hạn hoặc đã hủy

  const seatText = [...booking.seats]
    .sort((a, b) => a.seat.rowLabel.localeCompare(b.seat.rowLabel) || a.seat.seatNumber - b.seat.seatNumber)
    .map((s) => `${s.seat.rowLabel}${s.seat.seatNumber}`)
    .join(", ");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="rounded-lg border border-neutral-700 p-5">
        <p className="mb-3 rounded bg-amber-500/20 p-2 text-center text-xs text-amber-400">
          Cổng thanh toán mô phỏng. Không nhập thông tin thẻ thật.
        </p>
        <h1 className="text-xl font-bold">Thanh toán bằng {PAYMENT_METHODS[method].label}</h1>

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Mã đơn</dt>
            <dd>{booking.code}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Phim</dt>
            <dd className="text-right">{booking.showtime.movie.title}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Rạp</dt>
            <dd className="text-right">{booking.showtime.room.cinema.name}, {booking.showtime.room.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Suất chiếu</dt>
            <dd>{formatVn(booking.showtime.startTime)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-400">Ghế</dt>
            <dd>{seatText}</dd>
          </div>
          <div className="flex justify-between border-t border-neutral-800 pt-3 text-lg font-bold">
            <dt>Số tiền</dt>
            <dd>{formatMoney(booking.totalAmount)}</dd>
          </div>
        </dl>
      </div>

      <HoldControls code={booking.code} expiresAt={booking.expiresAt.toISOString()} showtimeId={booking.showtimeId} />
      <GatewaySimulator code={booking.code} method={method} />
    </div>
  );
}