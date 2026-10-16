export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value) {
  return /^(0|\+84)\d{9}$/.test(value);
}

// Tối thiểu 8 ký tự, có cả chữ và số
export function isValidPassword(value) {
  return typeof value === "string" && value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

// Kiểm tra dữ liệu rạp. partial=true: dùng khi sửa (chỉ kiểm tra các trường có gửi lên)
export function validateCinemaInput(body, { partial = false } = {}) {
  const data = {};
  const fields = {
    name: { label: "Tên rạp", min: 2, max: 100 },
    address: { label: "Địa chỉ", min: 5, max: 200 },
    region: { label: "Khu vực", min: 2, max: 50 },
  };

  for (const [key, rule] of Object.entries(fields)) {
    if (body[key] === undefined) {
      if (!partial) return { error: `${rule.label} là bắt buộc` };
      continue;
    }
    const value = String(body[key]).trim();
    if (value.length < rule.min || value.length > rule.max) {
      return { error: `${rule.label} phải từ ${rule.min} đến ${rule.max} ký tự` };
    }
    data[key] = value;
  }

  if (body.phone !== undefined) {
    const phone = String(body.phone ?? "").trim();
    if (phone && !/^[0-9+\s.-]{8,15}$/.test(phone)) {
      return { error: "Số điện thoại không hợp lệ" };
    }
    data.phone = phone || null;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return { error: "Trạng thái không hợp lệ" };
    data.isActive = body.isActive;
  }

  return { data };
}

function parseIntInRange(value, min, max) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

// Kiểm tra dữ liệu phòng. partial=true: dùng khi sửa (chỉ tên và trạng thái)
export function validateRoomInput(body, { partial = false } = {}) {
  const data = {};

  if (body.name === undefined) {
    if (!partial) return { error: "Tên phòng là bắt buộc" };
  } else {
    const name = String(body.name).trim();
    if (name.length < 1 || name.length > 50) {
      return { error: "Tên phòng phải từ 1 đến 50 ký tự" };
    }
    data.name = name;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return { error: "Trạng thái không hợp lệ" };
    data.isActive = body.isActive;
  }

  if (!partial) {
    const rows = parseIntInRange(body.rows, 1, 20);
    if (rows === null) return { error: "Số hàng ghế phải là số nguyên từ 1 đến 20" };

    const seatsPerRow = parseIntInRange(body.seatsPerRow, 1, 20);
    if (seatsPerRow === null) return { error: "Số ghế mỗi hàng phải là số nguyên từ 1 đến 20" };

    const vipRows =
      body.vipRows === undefined || body.vipRows === "" ? 0 : parseIntInRange(body.vipRows, 0, rows);
    if (vipRows === null) return { error: `Số hàng VIP phải là số nguyên từ 0 đến ${rows}` };

    data.rows = rows;
    data.seatsPerRow = seatsPerRow;
    data.vipRows = vipRows;
  }

  return { data };
}