import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validators";
import { sendVerificationEmail, devLinkFor } from "@/lib/accountEmails";

const GENERIC = "Nếu tài khoản tồn tại và chưa xác nhận, chúng tôi đã gửi lại email xác nhận. Hãy kiểm tra hộp thư.";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const user = await prisma.user.findUnique({ where: { email } });

  let result = null;
  if (user && user.isActive && !user.isVerified) {
    try {
      result = await sendVerificationEmail(user);
    } catch (error) {
      console.error("Không gửi được email xác nhận:", error);
    }
  }

  // Luôn trả lời giống nhau để không lộ email nào đã đăng ký
  return Response.json({ message: GENERIC, devLink: devLinkFor(result) });
}