import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseId } from "@/lib/http";
import { releaseExpiredBookings } from "@/lib/bookings";
import { PUBLIC_SHOWTIME_WHERE } from "@/lib/schedule";
import SeatPicker from "@/components/site/SeatPicker";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chọn ghế - Beta Cinemas" };

export default async function BookingPage({ params }) {
  const showtimeId = parseId((await params).showtimeId);
  if (!showtimeId) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/booking/${showtimeId}`)}`);

  await releaseExpiredBookings(); // nhả ghế của các đơn đã hết hạn

  const showtime = await prisma.showtime.findFirst({
    where: { id: showtimeId, ...PUBLIC_SHOWTIME_WHERE, startTime: { gt: new Date() } },
    include: {
      movie: { select: { title: true } },
      room: {
        include: {
          cinema: { select: { name: true } },
          seats: { where: { isActive: true }, orderBy: [{ rowLabel: "asc" }, { seatNumber: "asc" }] },
        },
      },
      bookingSeats: {
        select: { seatId: true, booking: { select: { userId: true, status: true } } },
      },
    },
  });
  if (!showtime) notFound(); // không tồn tại, đã đóng bán hoặc đã bắt đầu chiếu

  // Ghế người khác đã giữ hoặc đã mua (ghế của chính mình trong đơn đang giữ vẫn cho chọn lại)
  const takenIds = showtime.bookingSeats
    .filter((bs) => !(bs.booking.userId === user.id && bs.booking.status === "PENDING"))
    .map((bs) => bs.seatId);

  const ownHold = await prisma.booking.findFirst({
    where: { userId: user.id, showtimeId, status: "PENDING", expiresAt: { gt: new Date() } },
    select: { code: true },
  });

  return (
    <SeatPicker
      showtime={{
        id: showtime.id,
        movieTitle: showtime.movie.title,
        cinemaName: showtime.room.cinema.name,
        roomName: showtime.room.name,
        startTime: showtime.startTime.toISOString(),
        price: showtime.price,
      }}
      seats={showtime.room.seats.map((s) => ({
        id: s.id,
        rowLabel: s.rowLabel,
        seatNumber: s.seatNumber,
        type: s.type,
      }))}
      takenIds={takenIds}
      ownHold={ownHold}
    />
  );
}