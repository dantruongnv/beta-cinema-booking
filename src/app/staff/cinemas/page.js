import { requireStaffPage } from "@/lib/auth";
import CinemaManager from "@/components/staff/CinemaManager";

export default async function StaffCinemasPage() {
  await requireStaffPage();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Quản lý rạp chiếu</h1>
      <CinemaManager />
    </div>
  );
}