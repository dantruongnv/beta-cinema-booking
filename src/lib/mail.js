import nodemailer from "nodemailer";

export function isMailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// Địa chỉ web dùng trong liên kết email (cố định theo cấu hình)
export function getAppUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

let transporter;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

// Gửi email. Chưa cấu hình SMTP thì in nội dung ra terminal và trả về { sent: false }
export async function sendMail({ to, subject, text, html }) {
  if (!isMailConfigured()) {
    console.log(`\n[EMAIL - chưa cấu hình SMTP]\nTới: ${to}\nTiêu đề: ${subject}\n${text}\n`);
    return { sent: false };
  }
  await getTransporter().sendMail({
    from: `"Beta Cinemas" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
  return { sent: true };
}