import { requireStaffPage } from "@/lib/auth";
import MovieManager from "@/components/staff/MovieManager";

export default async function StaffMoviesPage() {
  await requireStaffPage();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Quản lý phim</h1>
      <MovieManager />
    </div>
  );
}