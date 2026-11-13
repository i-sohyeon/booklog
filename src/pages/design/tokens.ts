import source from '@/styles/tokens.scss?raw';

/**
 * 디자인 가이드용: tokens.scss 원본을 읽어 섹션별 토큰 목록으로 만듭니다.
 * 토큰을 고치면 가이드도 자동으로 바뀝니다(값을 여기에 따로 적지 않음).
 */
export interface Token {
  /** '--' 없는 이름 (예: plum-500) */
  name: string;
  /** 원본에 적힌 값 (예: var(--plum-700), clamp(...)) */
  raw: string;
  /** 다른 토큰을 가리키면 그 이름 */
  alias?: string;
  /** 줄 끝 주석 */
  note?: string;
}

export interface TokenSection {
  /** 원본의 `/* ---- 제목 ---- *\/` */
  title: string;
  tokens: Token[];
}

function parse(text: string): TokenSection[] {
  // 첫 번째 :root 블록만 (반응형·모션 축소 블록은 제외)
  const start = text.indexOf(':root {');
  const end = text.indexOf('\n}', start);
  const body = text.slice(start, end);
  const sections: TokenSection[] = [];
  let current: TokenSection | null = null;
  for (const line of body.split('\n')) {
    const head = /\/\*\s*-{2,}\s*(.+?)\s*-{2,}\s*\*\//.exec(line);
    if (head) {
      current = { title: head[1]!, tokens: [] };
      sections.push(current);
      continue;
    }
    const m = /^\s*--([\w-]+):\s*(.+?);\s*(?:\/\*\s*(.*?)\s*\*\/)?\s*$/.exec(line);
    if (!m || !current) continue;
    const raw = m[2]!.trim();
    const alias = /^var\(--([\w-]+)\)$/.exec(raw)?.[1];
    current.tokens.push({ name: m[1]!, raw, alias, note: m[3] || undefined });
  }
  return sections;
}

export const TOKEN_SECTIONS = parse(source);

export function section(prefix: string): TokenSection | undefined {
  return TOKEN_SECTIONS.find((s) => s.title.startsWith(prefix));
}

/** 브라우저가 계산한 실제 값 (별칭·clamp가 풀린 값) */
export function computed(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
}

/** '#5b2590' · 'rgb(…)' → [r, g, b] (0~255) */
export function toRgb(color: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join('') : hex[1]!;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  const rgb = /rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(color);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
}

export function toHex(color: string): string {
  const rgb = toRgb(color);
  return rgb ? `#${rgb.map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`.toUpperCase() : color;
}

/** WCAG 대비 (예: 4.5) */
export function contrast(a: string, b: string): number | null {
  const x = toRgb(a);
  const y = toRgb(b);
  if (!x || !y) return null;
  const lum = ([r, g, bl]: [number, number, number]) => {
    const f = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl);
  };
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
