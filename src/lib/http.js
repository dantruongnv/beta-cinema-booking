export function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function badRequest(message) {
  return Response.json({ message }, { status: 400 });
}