import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { badRequest } from "@/lib/http";
import { isPaymentMethod } from "@/lib/paymentMethods";
import { generateTransactionCode } from "@/lib/bookingCode";
import { releaseExpiredBookings } from "@/lib/bookings";

export async function POST(request, { params }) {
  const { user, error: authError } = await requireUser();
  if (authError) return authError;

  const code = String((await params).code ?? "").toUpperCase();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Dữ liệu không hợp lệ");
  }

  const { method, outcome } = body;
  if (!isPaymentMethod(method)) return badRequest("Phương thức thanh toán không hợp lệ");
  if (outcome !== "SUCCESS" && outcome !== "FAILED") return badRequest("Kết quả thanh toán không hợp lệ");

  await releaseExpiredBookings();

  const booking = await prisma.booking.findFirst({
    where: { code, userId: user.id },
    select: { id: true, status: true, totalAmount: true, expiresAt: true },
  });
  if (!booking) {
    return Response.json({ message: "Không tìm thấy đơn đặt vé" }, { status: 404 });
  }
  if (booking.status !== "PENDING") {
    return Response.json(
      { message: "Đơn không còn ở trạng thái chờ thanh toán (đã thanh toán, hết hạn hoặc đã hủy)" },
      { status: 409 }
    );
  }

  const now = new Date();
  if (!booking.expiresAt || booking.expiresAt <= now) {
    return Response.json({ message: "Đơn đã hết hạn giữ ghế" }, { status: 409 });
  }

  const paid = outcome === "SUCCESS";
  const paymentData = {
    method,
    status: paid ? "SUCCESS" : "FAILED",
    amount: booking.totalAmount, // số tiền luôn lấy từ CSDL, không nhận từ trình duyệt
    transactionCode: generateTransactionCode(method),
    paidAt: paid ? now : null,
  };

  // Đổi trạng thái đơn và ghi giao dịch trong cùng một giao dịch CSDL
  const conflict = await prisma.$transaction(async (tx) => {
    if (paid) {
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: "PENDING", expiresAt: { gt: now } },
        data: { status: "PAID" },
      });
      if (updated.count === 0) return true; // vừa hết hạn hoặc vừa bị xử lý ở nơi khác
    }
    await tx.payment.upsert({
      where: { bookingId: booking.id },
      create: { bookingId: booking.id, ...paymentData },
      update: paymentData,
    });
    return false;
  });

  if (conflict) {
    return Response.json({ message: "Đơn đã hết hạn hoặc đã được xử lý" }, { status: 409 });
  }
  return Response.json({ ok: true, status: paid ? "PAID" : "FAILED" });
}