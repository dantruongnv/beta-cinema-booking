const VN_OFFSET_MS = 7 * 60 * 60 * 1000; // Việt Nam UTC+7, không có giờ mùa hè
const pad = (n) => String(n).padStart(2, "0");

// Date -> "YYYY-MM-DDTHH:mm" theo giờ Việt Nam (dùng cho ô datetime-local)
export function toVnInputValue(date) {
  const d = new Date(new Date(date).getTime() + VN_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// "2026-10-20T19:30" (hiểu là giờ Việt Nam) -> Date chuẩn UTC; sai định dạng hoặc ngày không có thật -> null
export function parseVnDateTime(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute) - VN_OFFSET_MS);
  return toVnInputValue(date) === String(value) ? date : null;
}

// "2026-10-20" (ngày theo giờ Việt Nam) -> khoảng [start, end) tính bằng UTC
export function vnDayRange(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr ?? ""));
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const start = new Date(Date.UTC(year, month - 1, day) - VN_OFFSET_MS);
  if (!toVnInputValue(start).startsWith(String(dateStr))) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

// Hiển thị: "19:30 20/10/2026"
export function formatVn(date) {
  const d = new Date(new Date(date).getTime() + VN_OFFSET_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} ${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}