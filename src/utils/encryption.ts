import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || "your-256-bit-secret-key";

export function encryptPassword(plainText: string): string {
  return CryptoJS.AES.encrypt(plainText, SECRET_KEY).toString();
}

export function decryptPassword(cipherText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return "[decryption error]";
  }
}
