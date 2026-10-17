import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TTL_MS = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000, // 24 giờ
  RESET_PASSWORD: 60 * 60 * 1000, // 1 giờ
};
const COOLDOWN_MS = 60 * 1000; // tối thiểu 60 giây giữa hai lần gửi

export function hashToken(raw) {
  return createHash("sha256").update(String(raw)).digest("hex");
}

// Tạo mã mới và hủy các mã cũ chưa dùng cùng loại. Trả về { token } hoặc { tooSoon: true }
export async function issueToken(userId, type) {
  const latest = await prisma.verificationToken.findFirst({
    where: { userId, type },
    orderBy: { createdAt: "desc" },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < COOLDOWN_MS) {
    return { tooSoon: true };
  }

  const raw = randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { userId, type, usedAt: null } }),
    prisma.verificationToken.create({
      data: { userId, type, token: hashToken(raw), expiresAt: new Date(Date.now() + TTL_MS[type]) },
    }),
  ]);
  return { token: raw }; // chỉ trả mã gốc để đặt vào email; CSDL chỉ lưu bản băm
}

// Trả về bản ghi (kèm user) nếu mã còn hiệu lực: đúng loại, chưa dùng, chưa hết hạn
export async function findValidToken(raw, type) {
  if (typeof raw !== "string" || raw.length < 20) return null;
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(raw) },
    include: { user: true },
  });
  if (!record || record.type !== type || record.usedAt || record.expiresAt <= new Date()) return null;
  return record;
}