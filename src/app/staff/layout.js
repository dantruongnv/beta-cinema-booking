import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function StaffLayout({ children }) {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <nav className="mb-6 flex items-center gap-4 border-b pb-3">
        <Link href="/staff" className="font-semibold">Nhân viên</Link>
        <Link href="/staff/cinemas">Rạp chiếu</Link>
        <Link href="/staff/movies">Phim</Link>
        <Link href="/staff/showtimes">Lịch chiếu</Link>
        <span className="ml-auto">
          <LogoutButton />
        </span>
      </nav>
      {children}
    </div>
  );
}