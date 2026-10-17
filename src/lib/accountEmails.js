import { issueToken } from "@/lib/tokens";
import { sendMail, getAppUrl } from "@/lib/mail";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const button = (link, label) =>
  `<p><a href="${link}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">${label}</a></p>`;

async function sendLinkEmail({ user, type, path, subject, intro, label, footer }) {
  const issued = await issueToken(user.id, type);
  if (issued.tooSoon) return { tooSoon: true };

  const link = `${getAppUrl()}${path}?token=${issued.token}`;
  const result = await sendMail({
    to: user.email,
    subject,
    text: `Xin chào ${user.fullName},\n\n${intro}\n${link}\n\n${footer}`,
    html: `<p>Xin chào ${escapeHtml(user.fullName)},</p><p>${intro}</p>${button(link, label)}<p>Hoặc mở liên kết: ${link}</p><p>${footer}</p>`,
  });
  return { link, sent: result.sent };
}

export function sendVerificationEmail(user) {
  return sendLinkEmail({
    user,
    type: "VERIFY_EMAIL",
    path: "/verify-email",
    subject: "Xác nhận tài khoản Beta Cinemas",
    intro: "Hãy mở liên kết sau để xác nhận email (có hiệu lực 24 giờ).",
    label: "Xác nhận email",
    footer: "Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.",
  });
}

export function sendResetPasswordEmail(user) {
  return sendLinkEmail({
    user,
    type: "RESET_PASSWORD",
    path: "/reset-password",
    subject: "Đặt lại mật khẩu Beta Cinemas",
    intro: "Hãy mở liên kết sau để đặt lại mật khẩu (có hiệu lực 1 giờ, dùng được một lần).",
    label: "Đặt lại mật khẩu",
    footer: "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này; mật khẩu của bạn vẫn an toàn.",
  });
}

// Chỉ ở môi trường phát triển và chưa cấu hình email thì mới trả liên kết ra giao diện để thử
export function devLinkFor(result) {
  if (result && !result.sent && result.link && process.env.NODE_ENV !== "production") {
    return result.link;
  }
  return undefined;
}