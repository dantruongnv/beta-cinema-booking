import { requireStaff } from "@/lib/auth";

export async function GET() {
  const { user, error } = await requireStaff();
  if (error) return error;
  return Response.json({ ok: true, message: `Xin chào ${user.fullName}`, role: user.role });
}