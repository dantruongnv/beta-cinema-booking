// rows: số hàng (A, B, C...), seatsPerRow: số ghế mỗi hàng, vipRows: số hàng VIP (tính từ hàng cuối)
export function buildSeatLayout(rows, seatsPerRow, vipRows = 0) {
  const seats = [];
  for (let r = 0; r < rows; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    const type = r >= rows - vipRows ? "VIP" : "NORMAL";
    for (let seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
      seats.push({ rowLabel, seatNumber, type });
    }
  }
  return seats;
}