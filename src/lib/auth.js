import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

// Lấy user hiện tại từ DB (role luôn lấy từ DB, không tin dữ liệu trong cookie)
export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, phone: true, fullName: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

// Dùng trong API: trả về { user } hoặc { error } (error là Response có sẵn)
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { error: Response.json({ message: "Chưa đăng nhập" }, { status: 401 }) };
  }
  return { user };
}

export async function requireStaff() {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (user.role !== "STAFF") {
    return { error: Response.json({ message: "Không có quyền truy cập" }, { status: 403 }) };
  }
  return { user };
}

// Dùng trong trang (server component): chưa đăng nhập -> /login, không phải nhân viên -> /
export async function requireStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "STAFF") redirect("/");
  return user;
}