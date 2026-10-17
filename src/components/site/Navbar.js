import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="text-xl font-extrabold tracking-wide text-red-500">
          BETA <span className="text-white">Cinemas</span>
        </Link>
        <Link href="/movies" className="hover:text-red-400">Phim</Link>
        <Link href="/cinemas" className="hover:text-red-400">Rạp</Link>
        {user && <Link href="/tickets" className="hover:text-red-400">Vé của tôi</Link>}

        <div className="ml-auto flex items-center gap-3 text-sm">
          {user ? (
            <>
              <span className="hidden sm:inline">Xin chào, {user.fullName}</span>
              {user.role === "STAFF" && (
                <Link href="/staff" className="underline hover:text-red-400">Quản trị</Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-red-400">Đăng nhập</Link>
              <Link href="/register" className="rounded bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-500">
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}