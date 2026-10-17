import { randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ các ký tự dễ nhầm: I, O, 0, 1

// Ví dụ: BCK7M2QX9P
export function generateBookingCode() {
  let code = "BC";
  for (const byte of randomBytes(8)) {
    code += ALPHABET[byte % ALPHABET.length];
  }
  return code;
}