import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PosterBaseService {
  // ---------- URL / Blob ----------
  revokeObjectUrl(url?: string) {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }

  async blobUrlToDataUrl(blobUrl: string): Promise<string> {
    const res = await fetch(blobUrl);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(blob);
    });
  }

  openInNewTab(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  // ---------- Canvas helpers ----------
  createCanvas(w: number, h: number) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    return ctx;
  }

  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const resolved = src.startsWith('/') ? src : `/${src}`;
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`BG load failed: ${resolved}`));
      img.src = resolved;
    });
  }

  async waitFontsReadyWithTimeout(ms: number): Promise<void> {
    const anyDoc = document as any;
    const fontsReady = anyDoc?.fonts?.ready;
    if (!fontsReady) return;

    await Promise.race([
      fontsReady.catch(() => undefined),
      new Promise<void>((res) => setTimeout(res, ms)),
    ]);
  }

  toBlobWithTimeout(canvas: HTMLCanvasElement, ms: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      let done = false;

      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        resolve(null);
      }, ms);

      canvas.toBlob((b) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(b);
      }, 'image/png');
    });
  }

  // ---------- Util ----------
  safeFileName(name: string) {
    return (name || 'random').replace(/[\\/:*?"<>|]/g, '').trim();
  }

  formatThaiShortDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const buddhistYear = d.getFullYear() + 543;
    const yy = String(buddhistYear % 100).padStart(2, '0');
    return `${dd}/${mm}/${yy}`;
  }
}
