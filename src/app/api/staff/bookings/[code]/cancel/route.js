import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function POST(_request, { params }) {
  const { error: authError } = await requireStaff();
  if (authError) return authError;

  const code = String((await params).code ?? "").toUpperCase();

  const booking = await prisma.booking.findUnique({
    where: { code },
    include: {
      seats: true,
      showtime: { select: { id: true, startTime: true, endTime: true } },
    },
  });

  if (!booking) {
    return Response.json({ message: "Không tìm thấy đơn đặt vé" }, { status: 404 });
  }

  if (booking.status === "CANCELLED") {
    return Response.json({ message: "Đơn đặt vé này đã bị hủy trước đó" }, { status: 400 });
  }

  if (booking.status === "EXPIRED") {
    return Response.json({ message: "Đơn đặt vé này đã hết hạn giữ ghế" }, { status: 400 });
  }

  const now = new Date();
  if (booking.showtime.endTime <= now) {
    return Response.json(
      { message: "Suất chiếu này đã hoàn thành, không thể hủy vé hoặc nhả ghế" },
      { status: 400 }
    );
  }

  if (booking.showtime.startTime <= now) {
    return Response.json(
      { message: "Suất chiếu đang diễn ra, không thể hủy vé hoặc nhả ghế" },
      { status: 400 }
    );
  }

  // Thực hiện hủy đơn và giải phóng ghế trong 1 giao dịch CSDL
  await prisma.$transaction(async (tx) => {
    // Xóa liên kết ghế để nhả ghế ngay lập tức cho suất chiếu
    await tx.bookingSeat.deleteMany({
      where: { bookingId: booking.id },
    });

    // Cập nhật trạng thái đơn thành CANCELLED
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });
  });

  return Response.json({
    ok: true,
    message: `Đã hủy đơn ${code} và giải phóng ${booking.seats.length} ghế thành công.`,
  });
}
