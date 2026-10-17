import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MovieCard from "@/components/site/MovieCard";

export const revalidate = 60;

function getMovies(status, order, take) {
  return prisma.movie.findMany({
    where: { isActive: true, status },
    orderBy: [{ releaseDate: { sort: order, nulls: "last" } }, { id: "desc" }],
    take,
  });
}

function Section({ title, href, movies }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="border-l-4 border-red-600 pl-3 text-xl font-bold">{title}</h2>
        <Link href={href} className="text-sm text-red-400 hover:underline">Xem tất cả →</Link>
      </div>
      {movies.length === 0 ? (
        <p className="text-sm text-neutral-400">Chưa có phim nào.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function HomePage() {
  const [nowShowing, comingSoon] = await Promise.all([
    getMovies("NOW_SHOWING", "desc", 10),
    getMovies("COMING_SOON", "asc", 5),
  ]);

  // Phim nổi bật: ưu tiên phim đang chiếu có ảnh nền
  const featured = nowShowing.find((m) => m.backdropUrl) ?? nowShowing[0];

  return (
    <div>
      {featured && (
        <section className="relative mb-10 overflow-hidden rounded-xl bg-neutral-900">
          {featured.backdropUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={featured.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div
            className="absolute inset-0"
            style={{ backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.92), rgba(0,0,0,0.6), rgba(0,0,0,0))" }}
          />
          <div className="relative flex min-h-72 flex-col justify-end gap-3 p-6 md:min-h-96 md:max-w-xl">
            <span className="text-sm font-semibold uppercase text-red-400">Đang chiếu</span>
            <h1 className="text-3xl font-extrabold md:text-4xl">{featured.title}</h1>
            <p className="line-clamp-3 text-sm text-neutral-200">{featured.overview}</p>
            <div>
              <Link
                href={`/movies/${featured.id}`}
                className="inline-block rounded bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500"
              >
                Xem chi tiết và đặt vé
              </Link>
            </div>
          </div>
        </section>
      )}

      <Section title="Phim đang chiếu" href="/movies?tab=now" movies={nowShowing} />
      <Section title="Phim sắp chiếu" href="/movies?tab=coming" movies={comingSoon} />
    </div>
  );
}