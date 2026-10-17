// 90000 -> "90.000đ"
export function formatMoney(value) {
  return String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ";
}