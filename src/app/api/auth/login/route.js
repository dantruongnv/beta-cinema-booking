import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { normalizeEmail } from "@/lib/validators";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = String(body.password ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));

  // Cùng một thông báo cho cả "sai email" và "sai mật khẩu" để không lộ tài khoản nào tồn tại
  if (!valid) {
    return Response.json({ message: "Email hoặc mật khẩu không đúng" }, { status: 401 });
  }

  await createSession(user.id);
  return Response.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  });
}