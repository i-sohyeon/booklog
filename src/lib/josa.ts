/** 한국어 조사 자동 선택: withJosa('소년이 온다', '을/를') → '소년이 온다를' */
export function hasBatchim(word: string): boolean {
  const ch = word.trim().replace(/[」』)\]"'’”]+$/, '').slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false; // 한글이 아니면 받침 없음으로 처리
  return code % 28 !== 0;
}

export function josa(word: string, pair: '을/를' | '이/가' | '은/는' | '과/와' | '으로/로'): string {
  const [withB, withoutB] = pair.split('/') as [string, string];
  return hasBatchim(word) ? withB : withoutB;
}
