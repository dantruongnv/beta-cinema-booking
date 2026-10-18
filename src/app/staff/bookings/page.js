import { requireStaffPage } from "@/lib/auth";
import BookingManager from "@/components/staff/BookingManager";

export const metadata = { title: "Quản lý Đơn đặt vé - Beta Cinemas Staff" };

export default async function StaffBookingsPage() {
  await requireStaffPage();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Quản lý Vé & Đơn đặt</h1>
          <p className="text-sm text-neutral-400">
            Tra cứu đơn đặt vé của khách hàng, theo dõi trạng thái và hủy vé/giải phóng ghế khi cần thiết.
          </p>
        </div>
      </div>

      <BookingManager />
    </div>
  );
}
