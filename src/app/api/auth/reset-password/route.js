import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { findValidToken } from "@/lib/tokens";
import { isValidPassword } from "@/lib/validators";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  if (!isValidPassword(body.password)) {
    return Response.json({ message: "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số" }, { status: 400 });
  }

  const record = await findValidToken(body.token, "RESET_PASSWORD");
  if (!record || !record.user.isActive) {
    return Response.json({ message: "Liên kết không hợp lệ hoặc đã hết hạn" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);

  await prisma.$transaction([
    // Mở được email nghĩa là chủ tài khoản, nên đồng thời coi như đã xác nhận email
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, isVerified: true } }),
    prisma.verificationToken.updateMany({
      where: { userId: record.userId, type: "RESET_PASSWORD", usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return Response.json({ ok: true });
}