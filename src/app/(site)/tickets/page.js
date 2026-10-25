import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { releaseExpiredBookings } from "@/lib/bookings";
import BookingCard from "@/components/site/BookingCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vé của tôi - Beta Cinemas" };

function Section({ title, children, count }) {
  if (count === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 border-l-4 border-red-600 pl-3 text-xl font-bold">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export default async function MyTicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/tickets")}`);

  await releaseExpiredBookings();

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      showtime: {
        include: {
          movie: { select: { title: true, posterUrl: true } },
          room: { select: { name: true, cinema: { select: { name: true } } } },
        },
      },
      seats: { include: { seat: { select: { rowLabel: true, seatNumber: true } } } },
    },
  });

  const now = Date.now();
  const pending = bookings.filter((b) => b.status === "PENDING");
  const paid = bookings
    .filter((b) => b.status === "PAID")
    .sort((a, b) => b.showtime.startTime.getTime() - a.showtime.startTime.getTime());
  const others = bookings.filter((b) => b.status === "CANCELLED" || b.status === "EXPIRED");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Vé của tôi</h1>

      {bookings.length === 0 && <p className="text-neutral-400">Bạn chưa có đơn đặt vé nào.</p>}

      <Section title="Đang chờ thanh toán" count={pending.length}>
        {pending.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            href={`/checkout/${b.code}`}
            badge={{ text: "Chờ thanh toán", className: "bg-amber-600" }}
          />
        ))}
      </Section>

      <Section title="Vé đã thanh toán" count={paid.length}>
        {paid.map((b) => {
          const isCompleted = b.showtime.endTime.getTime() <= now;
          const isShowing = !isCompleted && b.showtime.startTime.getTime() <= now;
          const badge = isCompleted
            ? { text: "Đã hoàn thành", className: "bg-blue-800" }
            : isShowing
              ? { text: "Đang chiếu", className: "bg-purple-700" }
              : { text: "Sắp chiếu", className: "bg-green-700" };

          return (
            <BookingCard
              key={b.id}
              booking={b}
              href={`/tickets/${b.code}`}
              badge={badge}
            />
          );
        })}
      </Section>

      <Section title="Đơn đã hủy hoặc hết hạn" count={others.length}>
        {others.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            href={`/checkout/${b.code}`}
            badge={{ text: b.status === "EXPIRED" ? "Hết hạn" : "Đã hủy", className: "bg-neutral-600" }}
          />
        ))}
      </Section>
    </div>
  );
}
