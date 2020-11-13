// normalizeHexString adds a "0x" prefix and makes the length of the supplied string even by prefixing a 0 if odd
export function normalizeHexString(hex: string): string {
  if (hex.startsWith('0x')) {
    hex = hex.substr(2)
  }
  if (hex.length % 2 == 1) {
    hex = '0' + hex
  }
  return '0x' + hex
}
