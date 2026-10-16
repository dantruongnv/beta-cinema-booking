import { requireStaffPage } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

export default async function StaffPage() {
  const user = await requireStaffPage();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Khu vực nhân viên</h1>
      <p className="my-4">Xin chào, {user.fullName} ({user.email})</p>
      <LogoutButton />
    </main>
  );
}