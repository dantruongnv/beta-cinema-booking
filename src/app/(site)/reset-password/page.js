import Link from "next/link";
import { findValidToken } from "@/lib/tokens";
import ResetPasswordForm from "@/components/site/ResetPasswordForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đặt lại mật khẩu - Beta Cinemas" };

export default async function ResetPasswordPage({ searchParams }) {
  const sp = await searchParams;
  const token = String(sp.token ?? "");
  const record = await findValidToken(token, "RESET_PASSWORD");

  if (!record) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <h1 className="mb-2 text-2xl font-bold">Liên kết không hợp lệ hoặc đã hết hạn</h1>
        <p className="mb-6 text-neutral-400">Hãy yêu cầu một liên kết đặt lại mật khẩu mới.</p>
        <Link href="/forgot-password" className="inline-block rounded bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-500">
          Quên mật khẩu
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}