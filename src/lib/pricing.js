export const SEAT_TYPE_LABEL = { NORMAL: "Thường", VIP: "VIP", COUPLE: "Đôi" };

// Hệ số giá theo loại ghế so với giá suất chiếu
export const SEAT_MULTIPLIER = { NORMAL: 1, VIP: 1.2, COUPLE: 2 };

export function seatPrice(basePrice, type) {
  return Math.round((basePrice * (SEAT_MULTIPLIER[type] ?? 1)) / 1000) * 1000;
}