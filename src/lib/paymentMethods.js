export const PAYMENT_METHODS = {
  MOMO: { label: "Ví Momo", description: "Thanh toán bằng ví điện tử Momo" },
  VNPAY: { label: "VNPay", description: "Thanh toán bằng VNPay QR hoặc ứng dụng ngân hàng" },
  ATM: { label: "Thẻ ATM nội địa", description: "Thanh toán bằng thẻ ATM nội địa qua cổng thanh toán" },
  VISA: { label: "Thẻ Visa/Mastercard", description: "Thanh toán bằng thẻ quốc tế" },
};

export function isPaymentMethod(value) {
  return Object.prototype.hasOwnProperty.call(PAYMENT_METHODS, value);
}