import { prisma } from "@/lib/prisma";

// Chuyển đơn PENDING đã quá hạn sang EXPIRED và nhả ghế của chúng
export async function releaseExpiredBookings() {
  const expired = await prisma.booking.findMany({
    where: { status: "PENDING", expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  if (expired.length === 0) return 0;

  const ids = expired.map((b) => b.id);
  await prisma.$transaction(async (tx) => {
    // Cập nhật trước (có điều kiện), chỉ xóa ghế của đơn đã thực sự chuyển sang EXPIRED
    await tx.booking.updateMany({
      where: { id: { in: ids }, status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    await tx.bookingSeat.deleteMany({
      where: { booking: { id: { in: ids }, status: "EXPIRED" } },
    });
  });
  return ids.length;
}