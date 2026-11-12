/** 联机房间号：大写字母和数字，去掉易混的 0/O/1/I。长度为 32，便于均匀取模。 */

export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const ROOM_CODE_MIN_LEN = 4;
export const ROOM_CODE_MAX_LEN = 6;
export const ROOM_CODE_LEN = 5;

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidRoomCode(raw: string): boolean {
  const code = normalizeRoomCode(raw);
  if (code.length < ROOM_CODE_MIN_LEN || code.length > ROOM_CODE_MAX_LEN) return false;
  for (const ch of code) {
    if (!ROOM_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

/**
 * 生成 4–6 位房间号。字母表长度正好是 256 的因数，按字节取模无偏差。
 * 测试时可传入已准备好的随机字节。
 */
export function generateRoomCode(length: number = ROOM_CODE_LEN, bytes?: Uint8Array): string {
  const len = Math.min(ROOM_CODE_MAX_LEN, Math.max(ROOM_CODE_MIN_LEN, Math.floor(length)));
  const buf = new Uint8Array(len);
  if (bytes && bytes.length >= len) {
    buf.set(bytes.subarray(0, len));
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < len; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < len; i++) out += ROOM_CODE_ALPHABET[buf[i]! % ROOM_CODE_ALPHABET.length];
  return out;
}
