import { requireStaffPage } from "@/lib/auth";
import ShowtimeManager from "@/components/staff/ShowtimeManager";

export default async function StaffShowtimesPage() {
  await requireStaffPage();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Quản lý lịch chiếu</h1>
      <ShowtimeManager />
    </div>
  );
}