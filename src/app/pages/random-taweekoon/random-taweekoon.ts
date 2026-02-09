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
  templateUrl: './random-taweekoon.html',
  styleUrl: './random-taweekoon.scss',
})
export class RandomTaweekoon implements OnInit, OnDestroy {
  id = '';
  titleTh = '';

  bgUrl = '/assets/img/bgTaweekoon.jpg';

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

  // ✅ กันโหลดซ้ำทุกครั้ง/ทุกบ้าน (สำคัญบน iOS)
  private static dsnReady?: Promise<void>;

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

  // ✅ โหลด DSN-YaoWaRat.ttf ให้ “ชัวร์” ก่อนวาด (แก้เลข/ตัวหนังสือตกบน iPhone)
  private async ensureTaweekoonFontReady(): Promise<void> {
    if (!this.isBrowser) return;

    if (RandomTaweekoon.dsnReady) {
      await RandomTaweekoon.dsnReady;
      return;
    }

    RandomTaweekoon.dsnReady = (async () => {
      try {
        const fonts: any = (document as any).fonts;
        if (!fonts?.add || !fonts?.load) return;

        // โหลดจากไฟล์จริงใน assets
        const face = new FontFace(
          'DSN YaoWaRat',
          'url(/assets/fonts/DSN-YaoWaRat.ttf) format("truetype")',
          { style: 'normal', weight: '400' }
        );

        const loaded = await face.load();
        fonts.add(loaded);

        await Promise.race([
          Promise.all([
            fonts.load(`400 32px "DSN YaoWaRat"`),
          ]),
          new Promise<void>((r) => setTimeout(r, 2500)),
        ]);

        await Promise.race([
          fonts.ready,
          new Promise<void>((r) => setTimeout(r, 2500)),
        ]);
      } catch {
        // ปล่อย fallback ได้ แต่ไม่ให้พัง
      }
    })();

    await RandomTaweekoon.dsnReady;
  }

  // (ตัวเดิมคุณ) preload ผ่าน document.fonts.load — เก็บไว้ได้ แต่ให้เรียก “หลัง” ensureTaweekoonFontReady
  private async preloadHouseFont(): Promise<void> {
  if (!this.isBrowser) return;

  const fonts: any = (document as any).fonts;
  if (!fonts?.load) return;

  const weights = [500, 700, 800, 900]; // เผื่อ date/title/number
  const probeSize = 32;

  // ✅ ดึง “ชื่อฟอนต์จริงตัวแรก” จาก familyMain เช่น '"DSN YaoWaRat", sans-serif' -> 'DSN YaoWaRat'
  const firstFamily = (this.FONT.familyMain || '')
    .split(',')[0]                 // เอาก่อน comma
    .trim()
    .replace(/^['"]|['"]$/g, '');  // ตัด ' " ครอบออก

  if (!firstFamily) return;

  try {
    // ✅ โหลดแบบชัวร์: ใช้ชื่อฟอนต์จริงเท่านั้น (ไม่ใส่ fallback)
    await Promise.race([
      Promise.all(weights.map((w) => fonts.load(`${w} ${probeSize}px "${firstFamily}"`))),
      new Promise<void>((r) => setTimeout(r, 2500)),
    ]);


    await Promise.race([
      fonts.ready,
      new Promise<void>((r) => setTimeout(r, 2500)),
    ]);
  } catch {}
}


  async ngOnInit(): Promise<void> {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear() + 543).slice(-2);
    this.dateText = `${dd}-${mm}-${yy}`;

    if (!this.isBrowser) return;

    // ✅ รอ Angular stable ก่อน (ลดโอกาส race)
    await new Promise<void>((resolve) => {
      this.appRef.isStable
        .pipe(
          filter((stable) => stable),
          take(1)
        )
        .subscribe(() => resolve());
    });

    // ✅ โหลดฟอนต์ DSN ให้ชัวร์ก่อน subscribe/ก่อนวาด
    await this.ensureTaweekoonFontReady();

    // (ถ้าอยากคงไว้ก็ได้) preload เพิ่มอีกชั้นตาม familyMain
    await this.preloadHouseFont();

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
          from(this.buildPosterTaweekoon1040()).pipe(
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
    this.router.navigate(['/taweekoon']);
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

    let b = this.randInt(0, 9);
    while (b === a) b = this.randInt(0, 9);

    this.rollText = `${a} - ${b}`;

    this.focus2 = `${a}${b}`;
    this.focus1 = '';

    const globalUsed = new Set<string>();

    globalUsed.add(this.focus2);

    globalUsed.add(`${b}${a}`);

    const topRow = this.makeTwoDigitRow(a, 3, undefined, globalUsed);
    const bottomRow = this.makeTwoDigitRow(b, 3, undefined, globalUsed);

    this.twoDigits = [...topRow, ...bottomRow];

    // ✅ เลข 3 หลัก (ไปแสดงแทนช่องวันที่ล่าง)
    this.threeDigits = [this.three(), this.three(), this.three()];
  }

  // ---------- ฟอนต์/การวาด (ปรับให้คล้าย ref) ----------
  private readonly FONT = {
    familyMain: '"DSN YaoWaRat", sans-serif',
    weight: { title: 400, number: 400, date: 400, focus: 400 },
    strokeRatio: { title: 0, number: 0.08, focus: 0, date: 0 },
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
      ctx.font = `${weight} ${size}px "DSN YaoWaRat"`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    }
    return minFont;
  }

  private async nextFrame(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
  }
}


  private async buildPosterTaweekoon1040(): Promise<string> {
    const W = 1040;
    const H = 1040;

    await this.ensureTaweekoonFontReady();

    const canvas = this.poster.createCanvas(W, H);
    const ctx = this.poster.get2d(canvas);

    // BG
    const bg = await this.poster.loadImage(this.bgUrl);
    ctx.drawImage(bg, 0, 0, W, H);

    await this.nextFrame(2);

    // Fonts
    await this.poster.waitFontsReadyWithTimeout(1500);
    
    // helper outline
    const drawOutlined = (
      text: string,
      x: number,
      y: number,
      fontPx: number,
      role: 'title' | 'number' | 'focus' | 'date' = 'number',
      fill: string = '#ffffff',
      _stroke: string = '#000000',
      align: CanvasTextAlign = 'center'
    ) => {
      ctx.save();

      const weight =
        role === 'title'
          ? this.FONT.weight.title
          : role === 'date'
          ? this.FONT.weight.date
          : role === 'focus'
          ? this.FONT.weight.focus
          : this.FONT.weight.number;

      ctx.font = `${weight} ${fontPx}px "DSN YaoWaRat"`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';

      ctx.fillStyle = fill;
      ctx.fillText(text, x, y);

      ctx.restore();
    };

    // ====== 1) TITLE: แถบทองบน ======
    {
      const x = W * 0.56;
      const y = H * 0.17;
      const maxW = W * 0.62;

      const rawTitle = this.titleTh || '';
      const title = rawTitle.length > 18 ? rawTitle.slice(0, 17) + '…' : rawTitle;

      //ปรับ maxFont ตามความยาวข้อความ
      let maxFont = 92; // ค่าเริ่มต้น (สวยกำลังดี)
      if (title.length <= 10) {
        maxFont = 150; // สั้นมาก → ใหญ่ได้
      } else if (title.length <= 14) {
        maxFont = 130; // สั้นปานกลาง
      } else {
        maxFont = 100; // ยาว → จำกัด
      }

      const fs = this.fitFontSize(ctx, title, maxW, maxFont, 26, 700);

      drawOutlined(title, x, y, fs, 'title', '#f9f355', '#000000');
    }

    // ====== 2) rollText: วงรีกลาง ======
    {
      const x = W * 0.505;
      const y = H * 0.405;
      const maxW = W * 0.34;
      const fs = this.fitFontSize(ctx, this.rollText, maxW, 220, 64, 900);
      drawOutlined(this.rollText, x, y, fs, 'number', '#ffffff', '#000000');
    }

    // ====== 3) twoDigits: กรอบใหญ่ซ้าย (3x2) ======
    {
      // กรอบใหญ่ซ้าย: โดยประมาณ (กันชนเส้นกรอบ)
      const rectX = W * 0.335; // center x ของกรอบใหญ่ซ้าย
      const rectY = H * 0.66; // center y ของกรอบใหญ่ซ้าย
      const rectW = W * 0.54; // กว้างภายในกรอบ
      const rectH = H * 0.3; // สูงภายในกรอบ

      const left = rectX - rectW / 2;
      const top = rectY - rectH / 2;

      const cols = 3,
        rows = 2;
      const cellW = rectW / cols;
      const cellH = rectH / rows;

      for (let i = 0; i < this.twoDigits.length; i++) {
        const c = i % cols;
        const r = Math.floor(i / cols);

        const x = left + (c + 0.5) * cellW;
        const y = top + (r + 0.5) * cellH;

        const fs = this.fitFontSize(ctx, this.twoDigits[i], cellW * 0.82, 220, 34, 900);
        drawOutlined(this.twoDigits[i], x, y, fs, 'number', '#ffffff', '#000000');
      }
    }

    // ====== focus2: วงกลมขวา (เลขอัด 2 หลัก) ======
    {
      const x = W * 0.81;
      const y = H * 0.7155;

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 120;

      const maxW = W * 0.22;
      const fs = this.fitFontSize(ctx, this.focus2, maxW, 390, 90, 800);

      drawOutlined(this.focus2, x, y, fs, 'focus', '#f9f355', '#000000');

      ctx.restore();
    }

    // ====== 5) DATE: ======
    {
      const x = W * 0.83;
      const y = H * 0.055;

      const maxW = W * 0.4;
      const fs = this.fitFontSize(ctx, this.dateText, maxW, 120, 22, 700);
      drawOutlined(this.dateText, x, y, fs, 'date', '#571709', '#ffffff');
    }

    // three-bar (3 ช่อง)
    {
      const rectX = W * 0.335;
      const rectY = H * 0.89;
      const rectW = W * 0.55; // ความกว้างแถบรวม

      const left = rectX - rectW / 2;

      const nums = this.threeDigits && this.threeDigits.length ? this.threeDigits.slice(0, 3) : [];
      const cols = Math.max(1, nums.length);
      const cellW = rectW / cols;

      for (let i = 0; i < cols; i++) {
        const cellX = left + (i + 0.5) * cellW;

        const maxCellW = cellW * 0.82;

        const fs = this.fitFontSize(ctx, nums[i], maxCellW, 170, 28, 900);

        drawOutlined(nums[i], cellX, rectY, fs, 'number', '#ffffff', '#000000');
      }
    }

    // output
    const blob = await this.poster.toBlobWithTimeout(canvas, 2000);
    if (blob) return URL.createObjectURL(blob);
    return canvas.toDataURL('image/png');
  }
}
