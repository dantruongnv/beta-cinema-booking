import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validators";
import { sendResetPasswordEmail, devLinkFor } from "@/lib/accountEmails";

const GENERIC = "Nếu email đã đăng ký, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Hãy kiểm tra hộp thư.";

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
  if (user && user.isActive) {
    try {
      result = await sendResetPasswordEmail(user);
    } catch (error) {
      console.error("Không gửi được email đặt lại mật khẩu:", error);
    }
  }

  // Luôn trả lời giống nhau dù email có tồn tại hay không
  return Response.json({ message: GENERIC, devLink: devLinkFor(result) });
}