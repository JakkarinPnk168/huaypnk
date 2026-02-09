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
  selector: 'app-random-oat',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './random-mahaheng.html',
  styleUrl: './random-mahaheng.scss',
})
export class RandomMahaheng implements OnInit, OnDestroy {
  id = '';
  titleTh = '';
  bgUrl = '/assets/img/bgMahaheng.jpg';

  dateText = '';
  rollText = '0-0';
  focus1 = '0'; // เน้นอัด 1 หลัก
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

    // 2) ⭐ รอให้ฟอนต์ Niramit โหลดจริง (สำคัญมากสำหรับ canvas)
    try {
      await (document as any).fonts?.load('400 16px Niramit');
      await (document as any).fonts?.load('500 16px Niramit');
      await (document as any).fonts?.load('600 16px Niramit');
      await (document as any).fonts?.load('700 16px Niramit');
    } catch {
      // browser เก่าที่ไม่รองรับ fonts API → ปล่อยผ่าน
    }

    // 3) หลังจาก font พร้อมแล้ว ค่อยเริ่ม flow เดิม
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
          from(this.buildPosterMin1080()).pipe(
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
    this.router.navigate(['/mahaheng']);
  }

  // ---------- สุ่มเลข ----------
  private randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  private two() {
    return this.randInt(0, 99).toString().padStart(2, '0');
  }
  private three() {
    return this.randInt(0, 999).toString().padStart(3, '0');
  }

  // สร้างเลข 2 หลักแบบ "หลักสิบ fix" + กันซ้ำ (รวมทั้งกลับหน้า-หลัง) + กันเลขเบิ้ล
  private makeTwoDigitRow(
    tens: number,
    count: number,
    unitMustInclude?: number,
    globalUsed?: Set<string>
  ): string[] {
    const usedUnitInRow = new Set<number>();
    const out: string[] = [];

    const canUse = (value: string, unit: number) => {
      if (usedUnitInRow.has(unit)) return false;
      if (tens === unit) return false;

      // กันซ้ำทั้ง 8 ตัว
      if (globalUsed && globalUsed.has(value)) return false;

      // กันซ้ำแบบกลับหน้า-หลัง เช่น 65 ห้ามมี 56
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

    // บังคับใส่ก่อน (ถ้ามี)
    if (unitMustInclude !== undefined) {
      let guard = 0;
      while (!pushUnit(unitMustInclude) && guard < 50) {
        unitMustInclude = this.randInt(0, 9);
        guard++;
      }
    }

    // เติมที่เหลือ
    let guard2 = 0;
    while (out.length < count && guard2 < 500) {
      const u = this.randInt(0, 9);
      pushUnit(u);
      guard2++;
    }

    // กันกรณีสุดทาง (โอกาสน้อยมาก) — ถ้าเติมไม่ครบ ให้ “ยอมปล่อย” แบบไม่ค้าง
    while (out.length < count) {
      const u = this.randInt(0, 9);
      const value = `${tens}${u}`;
      if (!globalUsed?.has(value)) {
        globalUsed?.add(value);
        out.push(value);
      }
    }

    return out;
  }

  private generateNumbers() {
    const a = this.randInt(0, 9);

    // ✅ ห้าม a=b
    let b = this.randInt(0, 9);
    while (b === a) b = this.randInt(0, 9);

    this.rollText = `${a}-${b}`;

    // focus1 ของ min ยังใช้แบบเดิมได้
    this.focus1 = String(a);

    // ✅ กติกาใหม่: "เลขวิ่งรูด" ห้ามซ้ำกับ "เลข 2 หลัก"
    // หมายถึงในกริดห้ามมีทั้ง ab และ ba
    const globalUsed = new Set<string>();
    globalUsed.add(`${a}${b}`); // ห้ามมี ab
    globalUsed.add(`${b}${a}`); // ห้ามมี ba (กันกลับหน้า-หลัง)

    // ✅ ทำเลข 2 หลัก 8 ตัว: แถวบน = หลักสิบ a, แถวล่าง = หลักสิบ b
    // ❌ ห้ามบังคับให้มี ab ในกริดแล้ว (ไม่งั้นจะซ้ำแน่นอน)
    const topRow = this.makeTwoDigitRow(a, 4, undefined, globalUsed);
    const bottomRow = this.makeTwoDigitRow(b, 4, undefined, globalUsed);

    this.twoDigits = [...topRow, ...bottomRow];

    // ---------- 3 หลัก (มีเลขวิ่งรูดอยู่ในตัว) ----------
    this.threeDigits = this.makeThreeDigitsWithRun(a, b, 2);
  }

  // ---------- ฟอนต์/การวาด (ปรับให้คล้าย ref) ----------
  private readonly FONT = {
    familyMain: 'Niramit, sans-serif',
    weight: { title: 700, number: 700, date: 500 },
    strokeRatio: { title: 0.06, number: 0.08, focus: 0.08, date: 0.08 },
    strokeMin: 5,
  };

  private fitFontSize(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    maxFont: number,
    minFont = 16,
    weight = 700
  ): number {
    let size = maxFont;
    while (size > minFont) {
      ctx.font = `${weight} ${size}px ${this.FONT.familyMain}`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    }
    return minFont;
  }

  private async buildPosterMin1080(): Promise<string> {
    const W = 1080;
    const H = 1080;

    const canvas = this.poster.createCanvas(W, H);
    const ctx = this.poster.get2d(canvas);

    // BG
    const bg = await this.poster.loadImage(this.bgUrl);
    ctx.drawImage(bg, 0, 0, W, H);

    // Fonts
    await this.poster.waitFontsReadyWithTimeout(1500);

    // ================= HELPER =================
    const drawText = (
      text: string,
      x: number,
      y: number,
      fontPx: number,
      opt: {
        role?: 'title' | 'number' | 'focus' | 'date';
        fill?: string;
        align?: CanvasTextAlign;
        strokeEnabled?: boolean;
        opacity?: number;
        shadow?: boolean;
      } = {}
    ) => {
      const {
        role = 'number',
        fill = '#ffffff',
        align = 'center',
        strokeEnabled = true,
        opacity = 1,
        shadow = false,
      } = opt;

      ctx.save();

      const weight = role === 'title' ? 400 : role === 'date' ? 500 : 900;

      ctx.globalAlpha = opacity;
      ctx.font = `${weight} ${fontPx}px Niramit, sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';

      // ===== Shadow Layer (เอียง คม นูน) =====
      if (shadow) {
        ctx.save();

        ctx.shadowColor = 'rgba(0,0,0,0.65)';
        ctx.shadowOffsetX = 8; // 👉 ขวา
        ctx.shadowOffsetY = 10; // 👇 ลง
        ctx.shadowBlur = 4; // คม ไม่ฟุ้ง

        ctx.fillStyle = '#000000';
        ctx.fillText(text, x, y);

        ctx.restore();
      }

      // ===== Stroke =====
      if (strokeEnabled) {
        ctx.save();
        ctx.lineJoin = 'round';

        let strokeRatio = 0.05;
        let minStroke = 6;

        if (role === 'title') {
          strokeRatio = 0.05;
          minStroke = 4;
        }

        if (role === 'number') {
          strokeRatio = 0.045;
          minStroke = 6;
        }

        if (role === 'focus') {
          strokeRatio = 0.07;
          minStroke = 8;
        }

        ctx.lineWidth = Math.max(minStroke, fontPx * strokeRatio);
        ctx.strokeStyle = '#000000';
        ctx.strokeText(text, x, y);
        ctx.restore();
      }

      // ===== ตัวอักษรจริง =====
      ctx.save();
      ctx.fillStyle = fill;
      ctx.fillText(text, x, y);
      ctx.restore();
    };

    // ====== 1) TITLE (ไม่มี stroke / ไม่มีเงา) ======
    {
      const maxW = W * 0.72;
      const titleSize = this.fitFontSize(ctx, this.titleTh, maxW, 64, 70, 700);

      drawText(this.titleTh, W * 0.5, H * 0.31, titleSize, {
        role: 'title',
        strokeEnabled: true,
        shadow: false,
      });
    }

    // ====== 2) เลขวิ่ง / รูด ======
    {
      drawText(this.rollText, W * 0.23, H * 0.46, 120, {
        role: 'number',
        shadow: true,
      });
    }

    // ====== 3) เลข 2 ตัว (เน้นอัด) ======
    {
      const rectX = W * 0.63;
      const rectY = H * 0.52;
      const rectW = W * 0.5;
      const rectH = H * 0.18;

      const left = rectX - rectW / 2;
      const top = rectY - rectH / 2;

      const cols = 4;
      const rows = 2;
      const cellW = rectW / cols;
      const cellH = rectH / rows;

      for (let i = 0; i < this.twoDigits.length; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);

        const x = left + (c + 0.5) * cellW;
        const y = top + (r + 0.5) * cellH;

        const fs = this.fitFontSize(ctx, this.twoDigits[i], cellW * 0.88, 86, 34, 900);

        drawText(this.twoDigits[i], x, y, fs, {
          role: 'number',
          shadow: true,
        });
      }
    }

    // ====== 4) เลขเน้น (focus) ======
    {
      drawText(this.focus1, W * 0.23, H * 0.615, 130, {
        role: 'focus',
        shadow: true,
      });
    }

    // ====== 5) DATE ======
    {
      drawText(this.dateText, W * 0.85, H * 0.05, 56, {
        role: 'date',
        shadow: true,
      });
    }

    // ====== 6) เลข 3 หลัก (จาง / ไม่มี stroke / ไม่มีเงา) ======
    {
      if (this.threeDigits.length) {
        const centerX = W * 0.63;
        const centerY = H * 0.65;
        const totalW = W * 0.4;
        const cellW = totalW / this.threeDigits.length;
        const startX = centerX - totalW / 2;

        for (let i = 0; i < this.threeDigits.length; i++) {
          const x = startX + (i + 0.5) * cellW;
          const y = centerY;

          const fs = this.fitFontSize(ctx, this.threeDigits[i], cellW * 0.9, 78, 38, 900);

          drawText(this.threeDigits[i], x, y, fs, {
            strokeEnabled: false,
            shadow: false,
            opacity: 0.85,
          });
        }
      }
    }

    // output
    const blob = await this.poster.toBlobWithTimeout(canvas, 2000);
    if (blob) return URL.createObjectURL(blob);
    return canvas.toDataURL('image/png');
  }

  // ---------- สุ่มเลข 3 หลัก โดยมีเลขวิ่งรูดอยู่ภายใน ----------
  private makeThreeDigitsWithRun(a: number, b: number, count: number): string[] {
    const results = new Set<string>();
    const patterns = [
      () => `${a}${b}${this.randInt(0, 9)}`, // ab_
      () => `${this.randInt(0, 9)}${a}${b}`, // _ab
      () => `${b}${a}${this.randInt(0, 9)}`, // ba_
      () => `${this.randInt(0, 9)}${b}${a}`, // _ba
    ];

    let guard = 0;
    while (results.size < count && guard < 500) {
      const pick = patterns[this.randInt(0, patterns.length - 1)];
      const value = pick();

      // กัน 000
      if (value === '000') {
        guard++;
        continue;
      }

      results.add(value);
      guard++;
    }

    return Array.from(results);
  }
}
