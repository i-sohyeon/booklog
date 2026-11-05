/**
 * 사진 첨부용: 긴 변을 maxSize로 줄여 JPEG data URL로 변환합니다.
 * (서버 업로드 전이라 브라우저 저장공간에 맞게 작게 저장)
 */
export async function imageFileToDataUrl(file: File, maxSize = 1080, quality = 0.78): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('이미지 파일만 첨부할 수 있어요.');
  if (file.size > 20 * 1024 * 1024) throw new Error('20MB 이하의 사진만 첨부할 수 있어요.');

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('사진을 읽을 수 없어요.'));
      el.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('사진을 처리할 수 없어요.');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** localStorage에 남은 대략적인 여유 (브라우저 기본 5MB 기준, 문자 수) */
export function storageHeadroom(limit = 5_000_000): number {
  try {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? '';
      used += k.length + (localStorage.getItem(k)?.length ?? 0);
    }
    return limit - used;
  } catch {
    return 0;
  }
}
