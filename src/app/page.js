import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Beta Cinema</h1>
      {user ? (
        <div className="my-4 flex flex-col gap-3">
          <p>Xin chào, {user.fullName} ({user.role === "STAFF" ? "nhân viên" : "khách hàng"})</p>
          {user.role === "STAFF" && (
            <Link href="/staff" className="text-blue-500 underline">Vào khu vực nhân viên</Link>
          )}
          <LogoutButton />
        </div>
      ) : (
        <div className="my-4 flex gap-4">
          <Link href="/login" className="text-blue-500 underline">Đăng nhập</Link>
          <Link href="/register" className="text-blue-500 underline">Đăng ký</Link>
        </div>
      )}
    </main>
  );
}