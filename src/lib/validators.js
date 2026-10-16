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

// TMDB không có phân loại độ tuổi theo chuẩn Việt Nam nên nhân viên tự chọn
export const AGE_RATINGS = ["P", "K", "T13", "T16", "T18"];
export const MOVIE_STATUSES = ["NOW_SHOWING", "COMING_SOON", "ENDED"];

// Kiểm tra dữ liệu phim. partial=true: dùng khi sửa (chỉ kiểm tra các trường có gửi lên)
export function validateMovieInput(body, { partial = false } = {}) {
  const data = {};

  if (body.title === undefined) {
    if (!partial) return { error: "Tên phim là bắt buộc" };
  } else {
    const title = String(body.title).trim();
    if (title.length < 1 || title.length > 200) {
      return { error: "Tên phim phải từ 1 đến 200 ký tự" };
    }
    data.title = title;
  }

  // Các trường chữ không bắt buộc: để trống thì lưu null
  const optionalTexts = {
    originalTitle: ["Tên gốc", 200],
    overview: ["Mô tả", 5000],
    genres: ["Thể loại", 200],
  };
  for (const [key, [label, max]] of Object.entries(optionalTexts)) {
    if (body[key] === undefined) continue;
    const value = String(body[key] ?? "").trim();
    if (value.length > max) return { error: `${label} tối đa ${max} ký tự` };
    data[key] = value || null;
  }

  if (body.durationMin === undefined) {
    if (!partial) return { error: "Thời lượng là bắt buộc" };
  } else {
    const n = Number(body.durationMin);
    if (!Number.isInteger(n) || n < 1 || n > 600) {
      return { error: "Thời lượng phải là số phút từ 1 đến 600" };
    }
    data.durationMin = n;
  }

  if (body.ageRating !== undefined) {
    const value = body.ageRating === "" || body.ageRating === null ? null : String(body.ageRating);
    if (value !== null && !AGE_RATINGS.includes(value)) {
      return { error: "Phân loại độ tuổi không hợp lệ" };
    }
    data.ageRating = value;
  }

  // Ảnh chỉ nhận đường dẫn https
  for (const [key, label] of [["posterUrl", "Poster"], ["backdropUrl", "Ảnh nền"]]) {
    if (body[key] === undefined) continue;
    const value = String(body[key] ?? "").trim();
    if (value && (value.length > 500 || !/^https:\/\//i.test(value))) {
      return { error: `${label} phải là đường dẫn bắt đầu bằng https://` };
    }
    data[key] = value || null;
  }

  if (body.trailerKey !== undefined) {
    const value = String(body.trailerKey ?? "").trim();
    if (value && !/^[\w-]{6,20}$/.test(value)) {
      return { error: "Mã trailer YouTube không hợp lệ" };
    }
    data.trailerKey = value || null;
  }

  if (body.releaseDate !== undefined) {
    if (!body.releaseDate) {
      data.releaseDate = null;
    } else {
      const date = new Date(body.releaseDate);
      if (Number.isNaN(date.getTime())) return { error: "Ngày khởi chiếu không hợp lệ" };
      data.releaseDate = date;
    }
  }

  if (body.status !== undefined) {
    if (!MOVIE_STATUSES.includes(body.status)) return { error: "Trạng thái phim không hợp lệ" };
    data.status = body.status;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return { error: "Trạng thái không hợp lệ" };
    data.isActive = body.isActive;
  }

  return { data };
}