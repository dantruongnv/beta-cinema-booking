import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const metadata = { title: "Xác nhận email - Beta Cinemas" };

function Message({ title, text, linkHref, linkText }) {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      <p className="mb-6 text-neutral-400">{text}</p>
      <Link href={linkHref} className="inline-block rounded bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500">
        {linkText}
      </Link>
    </div>
  );
}

export default async function VerifyEmailPage({ searchParams }) {
  const sp = await searchParams;
  const token = String(sp.token ?? "");

  const record =
    token.length >= 20
      ? await prisma.verificationToken.findUnique({
          where: { token: hashToken(token) },
          include: { user: true },
        })
      : null;

  if (!record || record.type !== "VERIFY_EMAIL") {
    return (
      <Message
        title="Liên kết không hợp lệ"
        text="Liên kết xác nhận không đúng. Hãy đăng nhập và chọn gửi lại email xác nhận."
        linkHref="/login"
        linkText="Đến trang đăng nhập"
      />
    );
  }

  // Đã xác nhận trước đó (ví dụ phần mềm của hộp thư mở liên kết trước)
  if (record.user.isVerified) {
    return (
      <Message
        title="Email đã được xác nhận"
        text="Tài khoản của bạn đã sẵn sàng. Bạn có thể đăng nhập."
        linkHref="/login"
        linkText="Đăng nhập"
      />
    );
  }

  if (record.usedAt || record.expiresAt <= new Date()) {
    return (
      <Message
        title="Liên kết đã hết hạn"
        text="Liên kết xác nhận đã hết hạn hoặc đã được dùng. Hãy đăng nhập và chọn gửi lại email xác nhận."
        linkHref="/login"
        linkText="Đến trang đăng nhập"
      />
    );
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return (
    <Message
      title="Xác nhận email thành công"
      text="Tài khoản của bạn đã được kích hoạt. Hãy đăng nhập để đặt vé."
      linkHref="/login"
      linkText="Đăng nhập"
    />
  );
}