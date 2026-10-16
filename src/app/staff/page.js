import { requireStaffPage } from "@/lib/auth";

export default async function StaffPage() {
  const user = await requireStaffPage();

  return (
    <div>
      <h1 className="text-2xl font-bold">Khu vực nhân viên</h1>
      <p className="my-4">Xin chào, {user.fullName} ({user.email})</p>
    </div>
  );
}