import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MovieCard from "@/components/site/MovieCard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Phim - Beta Cinemas" };

export default async function MoviesPage({ searchParams }) {
  const sp = await searchParams;
  const tab = sp.tab === "coming" ? "coming" : "now";
  const q = String(sp.q ?? "").trim();
  const status = tab === "coming" ? "COMING_SOON" : "NOW_SHOWING";

  const movies = await prisma.movie.findMany({
    where: {
      isActive: true,
      status,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { originalTitle: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ releaseDate: { sort: tab === "coming" ? "asc" : "desc", nulls: "last" } }, { id: "desc" }],
  });

  const qParam = q ? `&q=${encodeURIComponent(q)}` : "";
  const tabClass = (active) =>
    `border-b-2 px-1 pb-2 font-semibold ${active ? "border-red-600 text-white" : "border-transparent text-neutral-400 hover:text-white"}`;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Phim</h1>

      <div className="mb-6 flex flex-wrap items-end gap-6">
        <div className="flex gap-6">
          <Link href={`/movies?tab=now${qParam}`} className={tabClass(tab === "now")}>Đang chiếu</Link>
          <Link href={`/movies?tab=coming${qParam}`} className={tabClass(tab === "coming")}>Sắp chiếu</Link>
        </div>

        <form action="/movies" method="get" className="ml-auto flex gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Tìm tên phim..."
            className="w-56 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
          />
          <button type="submit" className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">
            Tìm
          </button>
        </form>
      </div>

      {movies.length === 0 ? (
        <p className="text-neutral-400">Không có phim nào phù hợp.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
}