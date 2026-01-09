import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  NgZone,
  ChangeDetectorRef,
  ApplicationRef,
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Subscription, from, of } from 'rxjs';
import {
  auditTime,
  map,
  distinctUntilChanged,
  switchMap,
  catchError,
  tap,
  filter,
  take,
} from 'rxjs/operators';
import { PosterBaseService } from '../../services/poster-base.service';

@Component({
  selector: 'app-random-top',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './random-top.html',
  styleUrl: './random-top.scss',
})
export class RandomTop implements OnInit, OnDestroy {
  id = '';
  titleTh = '';

  bgUrl = '/assets/img/bgtop.jpg';

  dateText = '';
  rollText = '0-0';
  focus2 = '00';
  twoDigits: string[] = [];
  threeDigits: string[] = [];

  generatedUrl = '';
  isGenerating = false;
  debugError = '';


  private sub?: Subscription;
  private readonly isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private appRef: ApplicationRef,
    private poster: PosterBaseService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  async ngOnInit(): Promise<void> {
    this.dateText = this.poster.formatThaiShortDate(new Date());
    if (!this.isBrowser) return;

    // 1) รอ Angular stable ก่อน (กัน asset / canvas / font ยังไม่พร้อม)
    await new Promise<void>((resolve) => {
      this.appRef.isStable
        .pipe(
          filter((stable) => stable),
          take(1)
        )
        .subscribe(() => resolve());
    });

    // 2) ⭐ รอให้ฟอนต์ Niramit โหลดก่อน (จุดสำคัญ)
    try {
      // น้ำหนักที่ใช้จริงใน poster
      await (document as any).fonts?.load('400 16px Niramit');
      await (document as any).fonts?.load('500 16px Niramit');
      await (document as any).fonts?.load('600 16px Niramit');
      await (document as any).fonts?.load('700 16px Niramit');
    } catch {
      // browser เก่าบางตัวไม่รองรับ fonts API → ปล่อยผ่าน
    }

    // 3) หลังจาก font พร้อมแล้ว ค่อยเริ่ม flow เดิมทั้งหมด
    this.sub = combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        auditTime(0),

        map(([p, q]) => ({
          id: p.get('id') ?? '',
          title: q.get('title') ?? '',
          seed: q.get('seed') ?? '',
        })),

        distinctUntilChanged((a, b) => a.id === b.id && a.title === b.title && a.seed === b.seed),

        tap(({ id, title }) => {
          this.id = id;
          this.titleTh = title;

          this.generateNumbers();

          this.debugError = '';
          this.isGenerating = true;
          this.cdr.detectChanges();
        }),

        switchMap(() =>
          from(this.buildPosterTop1040()).pipe(
            catchError((err) => {
              console.error('buildPoster error:', err);
              this.debugError = String(err?.message ?? err ?? 'unknown error');

              this.isGenerating = false;
              this.cdr.detectChanges();
              return of('');
            })
          )
        )
      )
      .subscribe((newUrl) => {
        this.ngZone.run(() => {
          if (newUrl) {
            const old = this.generatedUrl;
            this.generatedUrl = newUrl;

            // cleanup blob เก่า
            this.poster.revokeObjectUrl(old);
          }

          this.isGenerating = false;
          this.cdr.detectChanges();
        });
      });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.isBrowser) this.poster.revokeObjectUrl(this.generatedUrl);
    this.generatedUrl = '';
  }

  ////คลิกรูปเปิด URL
  openLink() {
    if (!this.isBrowser || !this.generatedUrl) return;
    this.poster.openInNewTab(this.generatedUrl);
  }

  rerollAndReload() {
    if (!this.isBrowser) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { seed: Date.now() },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  downloadPng() {
    if (!this.isBrowser || !this.generatedUrl) return;
    const safeTitle = this.poster.safeFileName(this.titleTh || 'random');
    this.poster.downloadDataUrl(this.generatedUrl, `${safeTitle}_${this.dateText}.png`);
  }

  goHome() {
    this.router.navigate(['/top']);
  }

  // ---------- สุ่มเลข (เฉพาะบ้าน top) ----------
private randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// สร้างเลข 2 หลักแบบ "หลักสิบ fix" และทำให้มี "unitMustInclude" อย่างน้อย 1 ตัว
private makeTwoDigitRow(
  tens: number,
  count: number,
  unitMustInclude?: number,
  globalUsed?: Set<string>
): string[] {
  const usedUnitInRow = new Set<number>();
  const out: string[] = [];

  const canUse = (value: string, unit: number) => {
  if (usedUnitInRow.has(unit)) return false; // กันซ้ำ unit ในแถว
  if (tens === unit) return false; // กัน 66, 55
  //  กันซ้ำทั้ง 8 ตัว (ตัวเดียวกัน)
  if (globalUsed && globalUsed.has(value)) return false;

  // ✅ กันซ้ำแบบกลับหน้า-หลัง เช่น 65 ห้ามมี 56
  const reversed = `${unit}${tens}`;
  if (globalUsed && globalUsed.has(reversed)) return false;

  return true;
};


  const pushUnit = (u: number) => {
    const value = `${tens}${u}`;
    if (!canUse(value, u)) return false;

    usedUnitInRow.add(u);
    globalUsed?.add(value);
    out.push(value);
    return true;
  };

  // บังคับใส่ก่อน
  if (unitMustInclude !== undefined) {
    // ถ้าชนกับ globalUsed ให้สุ่ม unit ใหม่จนกว่าจะใส่ได้
    let guard = 0;
    while (!pushUnit(unitMustInclude) && guard < 30) {
      unitMustInclude = this.randInt(0, 9);
      guard++;
    }
  }

  // เติมที่เหลือ
  while (out.length < count) {
    const u = this.randInt(0, 9);
    pushUnit(u);
  }

  return out;
}


private generateNumbers() {
  const a = this.randInt(0, 9);

  // ✅ ห้าม b ซ้ำกับ a (กัน 2-2 และกัน focus 22)
  let b = this.randInt(0, 9);
  while (b === a) {
    b = this.randInt(0, 9);
  }

  this.rollText = `${a} - ${b}`;
  this.focus2 = `${a}${b}`;

  const globalUsed = new Set<string>();

  const topRow = this.makeTwoDigitRow(a, 4, b, globalUsed);          // มี ab
  const bottomRow = this.makeTwoDigitRow(b, 4, undefined, globalUsed); // ไม่บังคับ ba (เพราะคุณกัน reversed แล้ว)

  this.twoDigits = [...topRow, ...bottomRow];

  this.threeDigits = Array.from({ length: 3 }, () =>
    this.randInt(0, 999).toString().padStart(3, '0')
  );
}

  // ---------- ฟอนต์/การวาด (เฉพาะบ้าน top) ----------
  private readonly FONT = {
    familyMain: 'Niramit, sans-serif',
    familyAlt: 'Niramit, sans-serif',

    weight: {
      title: 500,
      number: 500,
      date: 400,
    },

    strokeRatio: {
      title: 0.05,
      number: 0.07,
      three: 0.05,
      focus: 0.09,
    },

    strokeMin: 4,
  };

  private fitFontSize(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxFont: number,
    minFont = 16,
    role: 'title' | 'number' = 'number'
  ): number {
    const weight = role === 'title' ? this.FONT.weight.title : this.FONT.weight.number;

    let size = maxFont;
    while (size > minFont) {
      ctx.font = `${weight} ${size}px ${this.FONT.familyMain}`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    }
    return minFont;
  }

  private async buildPosterTop1040(): Promise<string> {
    const W = 1040;
    const H = 1040;

    const canvas = this.poster.createCanvas(W, H);
    const ctx = this.poster.get2d(canvas);

    // BG
    const bg = await this.poster.loadImage(this.bgUrl);
    ctx.drawImage(bg, 0, 0, W, H);

    // Fonts (กันค้าง)
    await this.poster.waitFontsReadyWithTimeout(1500);

    // helper วาดตัวหนังสือขาว + ขอบดำ (ยังอยู่ใน component เพราะใช้ FONT เฉพาะบ้าน)
    const drawOutlined = (
      text: string,
      x: number,
      y: number,
      fontPx: number,
      role: 'title' | 'number' | 'focus' = 'number',
      fill: string = '#ffffff',
      stroke: string = '#000000',
      align: CanvasTextAlign = 'center'
    ) => {
      ctx.save();

      const weight =
        role === 'title'
          ? this.FONT.weight.title
          : role === 'focus'
          ? this.FONT.weight.number
          : this.FONT.weight.number;

      const strokeRatio =
        role === 'title'
          ? this.FONT.strokeRatio.title
          : role === 'focus'
          ? this.FONT.strokeRatio.focus
          : this.FONT.strokeRatio.number;

      ctx.font = `${weight} ${fontPx}px ${this.FONT.familyMain}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';

      ctx.lineWidth = Math.max(this.FONT.strokeMin, fontPx * strokeRatio);
      ctx.strokeStyle = stroke;
      ctx.strokeText(text, x, y);

      ctx.fillStyle = fill;
      ctx.fillText(text, x, y);

      ctx.restore();
    };

    // Date
    ctx.save();
    ctx.font = `500 45px Niramit, sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.dateText, W * 0.81, H * 0.095);
    ctx.restore();

    // rollText
    drawOutlined(this.rollText, W * 0.5, H * 0.55, 90, 'number');

    // title
    const titleMaxWidth = W * 0.9;
    const titleFont = this.fitFontSize(ctx, this.titleTh, titleMaxWidth, 72, 28, 'title');
    drawOutlined(this.titleTh, W * 0.5, H * 0.4, titleFont, 'title');

    // two-grid (4x2)
    {
      const rectX = W * 0.38,
        rectY = H * 0.74,
        rectW = W * 0.56,
        rectH = H * 0.24;

      const left = rectX - rectW / 2,
        top = rectY - rectH / 2;

      const cols = 4,
        rows = 2;
      const cellW = rectW / cols;

      for (let i = 0; i < this.twoDigits.length; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);

        const cellX = left + (c + 0.5) * cellW;
        const cellY = top + (r + 0.5) * (rectH / rows);

        const fontSize = this.fitFontSize(ctx, this.twoDigits[i], cellW * 0.88, 70, 26);
        drawOutlined(this.twoDigits[i], cellX, cellY, fontSize, 'number');
      }
    }

    // focus
    {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 12;
      drawOutlined(this.focus2, W * 0.81, H * 0.72, 140, 'focus');
      ctx.restore();
    }

    // three-bar
    {
      const rectX = W * 0.38,
        rectY = H * 0.9,
        rectW = W * 0.58;
      const left = rectX - rectW / 2;

      for (let i = 0; i < this.threeDigits.length; i++) {
        const cellX = left + (i + 0.5) * (rectW / 3);
        const maxCellW = rectW / 3;

        const font3 = this.fitFontSize(ctx, this.threeDigits[i], maxCellW * 0.9, 66, 28);
        drawOutlined(this.threeDigits[i], cellX, rectY, font3, 'number');
      }
    }

    // output
    const blob = await this.poster.toBlobWithTimeout(canvas, 2000);
    if (blob) return URL.createObjectURL(blob);
    return canvas.toDataURL('image/png');
  }
}
