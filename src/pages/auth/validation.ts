const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(v: string): string | undefined {
  if (!v.trim()) return '이메일을 입력해 주세요.';
  if (!EMAIL_RE.test(v.trim())) return '이메일 형식을 확인해 주세요.';
  return undefined;
}

export function validatePassword(v: string): string | undefined {
  if (!v) return '비밀번호를 입력해 주세요.';
  if (v.length < 8) return '8자 이상 입력해 주세요.';
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return '영문과 숫자를 함께 사용해 주세요.';
  return undefined;
}

export function validateNickname(v: string): string | undefined {
  const t = v.trim();
  if (!t) return '닉네임을 입력해 주세요.';
  if (t.length < 2 || t.length > 12) return '2~12자로 입력해 주세요.';
  return undefined;
}
