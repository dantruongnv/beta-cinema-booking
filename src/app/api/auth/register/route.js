import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, isValidEmail, isValidPhone, isValidPassword } from "@/lib/validators";
import { sendVerificationEmail, devLinkFor } from "@/lib/accountEmails";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  const fullName = String(body.fullName ?? "").trim();
  const email = normalizeEmail(body.email);
  const phone = String(body.phone ?? "").trim() || null;
  const password = body.password;

  if (fullName.length < 2 || fullName.length > 100) {
    return Response.json({ message: "Họ tên phải từ 2 đến 100 ký tự" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return Response.json({ message: "Email không hợp lệ" }, { status: 400 });
  }
  if (phone && !isValidPhone(phone)) {
    return Response.json({ message: "Số điện thoại không hợp lệ" }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return Response.json({ message: "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    select: { id: true },
  });
  if (existing) {
    return Response.json({ message: "Email hoặc số điện thoại đã được đăng ký" }, { status: 409 });
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        phone,
        fullName,
        passwordHash: await bcrypt.hash(password, 10),
        role: "CUSTOMER", // luôn là khách hàng, KHÔNG nhận role từ client
        isVerified: false, // phải xác nhận email trước khi đăng nhập
      },
      select: { id: true, email: true, fullName: true },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return Response.json({ message: "Email hoặc số điện thoại đã được đăng ký" }, { status: 409 });
    }
    console.error(error);
    return Response.json({ message: "Lỗi máy chủ" }, { status: 500 });
  }

  let result = null;
  let emailFailed = false;
  try {
    result = await sendVerificationEmail(user);
  } catch (error) {
    console.error("Không gửi được email xác nhận:", error);
    emailFailed = true;
  }

  return Response.json({ ok: true, emailFailed, devLink: devLinkFor(result) }, { status: 201 });
}