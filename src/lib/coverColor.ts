import { useEffect, useState } from 'react';

/**
 * 표지 이미지의 대표 색 (책등 색으로 씀).
 * 카카오 표지는 다른 출처라 캔버스로 읽을 수 없어서 /api/books?image= 로 같은 출처에서 받아 읽습니다.
 * 한 번 뽑은 색은 이 기기에 저장해 다시 계산하지 않습니다.
 */
const KEY = 'booklog:cover-colors';
type Store = Record<string, string | null>;

let cache: Store | null = null;
function load(): Store {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store;
  } catch {
    cache = {};
  }
  return cache;
}
function save(url: string, color: string | null) {
  const store = load();
  store[url] = color;
  const keys = Object.keys(store);
  if (keys.length > 600) for (const k of keys.slice(0, keys.length - 600)) delete store[k];
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* 저장 공간 부족 등 — 이번만 계산 */
  }
}

const inflight = new Map<string, Promise<string | null>>();

/** 카카오 이미지 서버면 같은 출처 통로로, 그 밖(같은 출처 이미지 등)은 그대로 */
function readableSrc(url: string): string {
  try {
    const u = new URL(url, location.href);
    if (u.origin === location.origin) return u.href;
    return `/api/books?image=${encodeURIComponent(u.href)}`;
  } catch {
    return url;
  }
}

/** 작은 캔버스에 그려 색 묶음별로 세고, 넓게 쓰인 색 중 채도가 있는 쪽을 조금 더 쳐 줌 */
function dominant(img: HTMLImageElement): string | null {
  const w = 24;
  const h = 36;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null; // 다른 출처 이미지
  }
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n += 1;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  let best: { score: number; r: number; g: number; b: number } | null = null;
  for (const bin of bins.values()) {
    const r = bin.r / bin.n;
    const g = bin.g / bin.n;
    const b = bin.b / bin.n;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const score = bin.n * (1 + sat * 1.5);
    if (!best || score > best.score) best = { score, r, g, b };
  }
  if (!best) return null;
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`;
}

function extract(url: string): Promise<string | null> {
  const running = inflight.get(url);
  if (running) return running;
  const job = new Promise<string | null>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(dominant(img));
    img.onerror = () => resolve(null);
    img.src = readableSrc(url);
  }).then((color) => {
    save(url, color);
    inflight.delete(url);
    return color;
  });
  inflight.set(url, job);
  return job;
}

/** 표지 대표 색. 아직 모르면 undefined, 뽑을 수 없으면 null */
export function useCoverColor(url: string | undefined): string | null | undefined {
  const [color, setColor] = useState<string | null | undefined>(() => (url ? load()[url] : undefined));
  useEffect(() => {
    if (!url) {
      setColor(undefined);
      return;
    }
    const known = load()[url];
    if (known !== undefined) {
      setColor(known);
      return;
    }
    let alive = true;
    void extract(url).then((c) => alive && setColor(c));
    return () => {
      alive = false;
    };
  }, [url]);
  return color;
}

/** 배경색 위에 읽히는 글자색 (밝은 바탕엔 진한 글자) */
export function inkFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // 진한 글자(#1d1b20, 휘도 ≈ 0.012)와 밝은 글자(#fbf8f3, ≈ 0.94) 중 대비가 큰 쪽
  const onDark = (0.94 + 0.05) / (lum + 0.05);
  const onLight = (lum + 0.05) / (0.012 + 0.05);
  return onLight >= onDark ? '#1d1b20' : '#fbf8f3';
}
