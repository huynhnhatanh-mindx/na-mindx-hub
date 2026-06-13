/**
 * Ngăn chặn lỗi "chữ mồ côi" (orphan text) bằng cách thay thế khoảng trắng cuối cùng trong chuỗi
 * bằng một ký tự khoảng trắng không ngắt (non-breaking space - \u00a0).
 *
 * @param text Chuỗi văn bản cần xử lý
 */
export function preventOrphan(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  const str = String(text).trim();
  const words = str.split(/\s+/);
  if (words.length <= 1) return str;
  const last = words.pop();
  return words.join(' ') + '\u00a0' + last;
}
