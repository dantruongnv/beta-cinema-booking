import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseId } from "@/lib/http";
import Poster from "@/components/site/Poster";
import ShowtimeButton from "@/components/site/ShowtimeButton";
import { AGE_RATING_INFO } from "@/lib/movieLabels";
import { getBookingDays, PUBLIC_SHOWTIME_WHERE, SCHEDULE_SELECT, toPublicShowtime } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const id = parseId((await params).id);
  const cinema = id ? await prisma.cinema.findUnique({ where: { id }, select: { name: true } }) : null;
  return { title: cinema ? `${cinema.name} - Beta Cinemas` : "Rạp - Beta Cinemas" };
}

export default async function CinemaDetailPage({ params, searchParams }) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const sp = await searchParams;

  const cinema = await prisma.cinema.findUnique({
    where: { id },
    include: { _count: { select: { rooms: { where: { isActive: true } } } } },
  });
  if (!cinema || !cinema.isActive) notFound();

  const days = getBookingDays(7);
  const day = days.find((d) => d.key === sp.date) ?? days[0];

  // Hôm nay chỉ lấy các suất chưa chiếu; ngày khác lấy cả ngày
  const rows = await prisma.showtime.findMany({
    where: {
      ...PUBLIC_SHOWTIME_WHERE,
      room: { ...PUBLIC_SHOWTIME_WHERE.room, cinemaId: id },
      startTime: { gte: new Date(Math.max(Date.now(), day.start.getTime())), lt: day.end },
    },
    orderBy: { startTime: "asc" },
    select: SCHEDULE_SELECT,
  });

  // Gom theo phim
  const byMovie = new Map();
  for (const s of rows.map(toPublicShowtime)) {
    if (!byMovie.has(s.movie.id)) byMovie.set(s.movie.id, { movie: s.movie, items: [] });
    byMovie.get(s.movie.id).items.push(s);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cinemas" className="text-sm text-red-400 hover:underline">← Tất cả rạp</Link>
        <h1 className="mt-2 text-2xl font-bold">{cinema.name}</h1>
        <p className="text-sm text-neutral-400">{cinema.address}</p>
        <p className="text-xs text-neutral-500">
          {cinema.region}
          {cinema.phone ? `. Điện thoại: ${cinema.phone}` : ""}. {cinema._count.rooms} phòng chiếu
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {days.map((d) => (
          <Link
            key={d.key}
            href={`/cinemas/${id}?date=${d.key}`}
            className={`flex min-w-24 flex-col items-center rounded border px-3 py-2 text-sm ${
              d.key === day.key ? "border-red-600 bg-red-600 text-white" : "border-neutral-600 hover:border-red-500"
            }`}
          >
            <b>{d.label}</b>
            <span className="text-xs">{d.dateText}</span>
          </Link>
        ))}
      </div>

      {byMovie.size === 0 ? (
        <p className="text-sm text-neutral-400">Không có suất chiếu nào trong ngày này.</p>
      ) : (
        [...byMovie.values()].map(({ movie, items }) => {
          const age = AGE_RATING_INFO[movie.ageRating];
          return (
            <div key={movie.id} className="flex gap-4 rounded-lg border border-neutral-800 p-4">
              <Link href={`/movies/${movie.id}`} className="shrink-0">
                <Poster src={movie.posterUrl} alt={movie.title} className="aspect-[2/3] w-20 rounded" />
              </Link>
              <div className="flex flex-col gap-3">
                <div>
                  <Link href={`/movies/${movie.id}`} className="font-semibold hover:text-red-400">
                    {movie.title}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    {age ? `${age.label}. ` : ""}
                    {movie.durationMin} phút
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((s) => (
                    <ShowtimeButton key={s.id} showtime={s} />
                  ))}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}