import Link from "next/link";
import Poster from "@/components/site/Poster";
import { AGE_RATING_INFO } from "@/lib/movieLabels";

export default function MovieCard({ movie }) {
  const age = AGE_RATING_INFO[movie.ageRating];

  return (
    <Link href={`/movies/${movie.id}`} className="group flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-lg">
        <Poster
          src={movie.posterUrl}
          alt={movie.title}
          className="aspect-[2/3] w-full transition duration-300 group-hover:scale-105"
        />
        {age && (
          <span className={`absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold text-white ${age.className}`}>
            {age.label}
          </span>
        )}
      </div>
      <div>
        <h3 className="line-clamp-2 font-semibold group-hover:text-red-400">{movie.title}</h3>
        <p className="text-xs text-neutral-400">
          {movie.genres ?? "Đang cập nhật"} · {movie.durationMin} phút
        </p>
      </div>
    </Link>
  );
}