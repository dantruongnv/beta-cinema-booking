import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseId } from "@/lib/http";
import Poster from "@/components/site/Poster";
import ShowtimePicker from "@/components/site/ShowtimePicker";
import { AGE_RATING_INFO, STATUS_LABEL } from "@/lib/movieLabels";
import { getBookingDays, PUBLIC_SHOWTIME_WHERE, SCHEDULE_SELECT, toPublicShowtime } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const id = parseId((await params).id);
  const movie = id ? await prisma.movie.findUnique({ where: { id }, select: { title: true } }) : null;
  return { title: movie ? `${movie.title} - Beta Cinemas` : "Phim - Beta Cinemas" };
}

export default async function MovieDetailPage({ params }) {
  const id = parseId((await params).id);
  if (!id) notFound();

  const movie = await prisma.movie.findUnique({ where: { id } });
  if (!movie || !movie.isActive) notFound();

  const age = AGE_RATING_INFO[movie.ageRating];
  const releaseText = movie.releaseDate
    ? new Date(movie.releaseDate).toLocaleDateString("vi-VN", { timeZone: "UTC" })
    : "Đang cập nhật";

  // Lịch chiếu 7 ngày tới (phim đã ngừng chiếu thì không có)
  const days = getBookingDays(7);
  const rows =
    movie.status === "ENDED"
      ? []
      : await prisma.showtime.findMany({
          where: {
            ...PUBLIC_SHOWTIME_WHERE,
            movieId: movie.id,
            startTime: { gte: new Date(), lt: days[days.length - 1].end },
          },
          orderBy: { startTime: "asc" },
          select: SCHEDULE_SELECT,
        });

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-xl bg-neutral-900">
        {movie.backdropUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={movie.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div
          className="absolute inset-0"
          style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.95), rgba(0,0,0,0.75), rgba(0,0,0,0.5))" }}
        />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row">
          <Poster
            src={movie.posterUrl}
            alt={movie.title}
            className="aspect-[2/3] w-44 shrink-0 self-center rounded-lg md:self-start"
          />
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-extrabold">{movie.title}</h1>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="text-neutral-300">{movie.originalTitle}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm">
              {age && (
                <span className={`rounded px-2 py-0.5 font-bold text-white ${age.className}`} title={age.description}>
                  {age.label}
                </span>
              )}
              <span>{movie.durationMin} phút</span>
              <span>·</span>
              <span>{movie.genres ?? "Đang cập nhật"}</span>
              <span>·</span>
              <span>Khởi chiếu: {releaseText}</span>
              <span className="rounded bg-neutral-700 px-2 py-0.5">{STATUS_LABEL[movie.status]}</span>
            </div>
            {age && <p className="text-xs text-neutral-300">{age.description}</p>}

            <h2 className="mt-2 font-semibold">Nội dung phim</h2>
            <p className="text-sm leading-relaxed text-neutral-200">
              {movie.overview ?? "Đang cập nhật nội dung."}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 border-l-4 border-red-600 pl-3 text-xl font-bold">Lịch chiếu</h2>
        {movie.status === "ENDED" ? (
          <p className="text-sm text-neutral-400">Phim đã ngừng chiếu.</p>
        ) : (
          <ShowtimePicker
            days={days.map(({ key, label, dateText }) => ({ key, label, dateText }))}
            showtimes={rows.map(toPublicShowtime)}
          />
        )}
      </section>

      {movie.trailerKey && (
        <section>
          <h2 className="mb-3 border-l-4 border-red-600 pl-3 text-xl font-bold">Trailer</h2>
          <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${movie.trailerKey}`}
              title={`Trailer ${movie.title}`}
              className="h-full w-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </section>
      )}

      <div>
        <Link href="/movies" className="text-sm text-red-400 hover:underline">← Quay lại danh sách phim</Link>
      </div>
    </div>
  );
}