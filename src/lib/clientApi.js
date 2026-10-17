export async function apiRequest(url, { method = "GET", body } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // phản hồi không phải JSON
    }
    if (!res.ok) {
      return { ok: false, message: data?.message || `Lỗi ${res.status}`, data };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Không kết nối được máy chủ", data: null };
  }
}