import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(_request, { params }) {
  const { user, error: authError } = await requireUser();
  if (authError) return authError;

  const code = String((await params).code ?? "").toUpperCase();
  const booking = await prisma.booking.findFirst({
    where: { code, userId: user.id },
    select: { id: true, status: true },
  });
  if (!booking) {
    return Response.json({ message: "Không tìm thấy đơn đặt vé" }, { status: 404 });
  }
  if (booking.status !== "PENDING") {
    return Response.json({ message: "Chỉ hủy được đơn đang chờ thanh toán" }, { status: 409 });
  }

  // Nhả ghế rồi đánh dấu hủy (chỉ khi đơn vẫn còn PENDING)
  await prisma.$transaction(async (tx) => {
    const result = await tx.booking.updateMany({
      where: { id: booking.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (result.count > 0) {
      await tx.bookingSeat.deleteMany({ where: { bookingId: booking.id } });
    }
  });
  return Response.json({ ok: true });
}