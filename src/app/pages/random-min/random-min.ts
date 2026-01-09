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
  templateUrl: './random-min.html',
  styleUrl: './random-min.scss',
})
export class RandomMin implements OnInit, OnDestroy {
  id = '';
  titleTh = '';

  


  bgUrl = '/assets/img/bgmin.jpg'; 

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

      distinctUntilChanged(
        (a, b) => a.id === b.id && a.title === b.title && a.seed === b.seed
      ),

      tap(({ id, title }) => {
        this.id = id;
        this.titleTh = title;

        this.generateNumbers();

        this.debugError = '';
        this.isGenerating = true;
        this.cdr.detectChanges();
      }),

      switchMap(() =>
        from(this.buildPosterOat1080()).pipe(
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
    this.router.navigate(['/min']);
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

  // ✅ ห้าม a=b (กัน 2-2 และกัน focus เบิ้ล)
  let b = this.randInt(0, 9);
  while (b === a) {
    b = this.randInt(0, 9);
  }

  this.rollText = `${a} - ${b}`;

  // ✅ focus1 เอาเลขตัวหน้า (ตามที่คุณใช้)
  this.focus1 = String(a);

  // (ถ้าอยากกลับมาใช้ focus2 2 หลัก ก็เปิดบรรทัดนี้ได้)
  // this.focus2 = `${a}${b}`;

  // ✅ ทำเลข 2 หลัก 8 ตัว: แถวบน = หลักสิบ a, แถวล่าง = หลักสิบ b
  // และต้องมี "ab" อยู่ในกริดด้วย (เหมือนที่แก้ใน top)
  const globalUsed = new Set<string>();

  const topRow = this.makeTwoDigitRow(a, 4, b, globalUsed);          // บังคับให้มี ab
  const bottomRow = this.makeTwoDigitRow(b, 4, undefined, globalUsed); // ไม่บังคับ ba เพราะเรากัน reversed แล้ว

  this.twoDigits = [...topRow, ...bottomRow];

  // (min ของคุณเหมือนไม่ใช้ 3 หลัก) ถ้าไม่ใช้ให้เคลียร์เป็น []
  this.threeDigits = [];
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

  private async buildPosterOat1080(): Promise<string> {
  const W = 1080;
  const H = 1080;

  const canvas = this.poster.createCanvas(W, H);
  const ctx = this.poster.get2d(canvas);

  // BG
  const bg = await this.poster.loadImage(this.bgUrl);
  ctx.drawImage(bg, 0, 0, W, H);

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
    stroke: string = '#000000',
    align: CanvasTextAlign = 'center'
  ) => {
    ctx.save();

    const weight =
      role === 'title' ? 800 :
      role === 'date'  ? 700 :
      900;

    const ratio =
      role === 'title' ? 0.08 :
      role === 'focus' ? 0.05 :
      role === 'date'  ? 0.08 :
      0.05;

    ctx.font = `${weight} ${fontPx}px Niramit, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';

    ctx.lineWidth = Math.max(6, fontPx * ratio);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);

    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);

    ctx.restore();
  };

  // ====== 1) TITLE: วางบน "แถบทองยาว" กลางบน ======
  // ตำแหน่งแถบจากรูปจริง: กึ่งกลางแนวนอน, ช่วง y ประมาณ 220-300
  {
    const maxW = W * 0.72;                 
    const titleSize = this.fitFontSize(ctx, this.titleTh, maxW, 64, 28, 900);
    drawOutlined(this.titleTh, W * 0.50, H * 0.245, titleSize, 'title', '#ffffff', '#000000');
  }

  // ====== 2) rollText: วางใกล้คำว่า "วิ่ง-รูด" (ซ้ายกลาง) ======
  // จากรูปจริง: อยู่ใต้ "วิ่ง-รูด" นิดหน่อย
  {
    drawOutlined(this.rollText, W * 0.51, H * 0.36, 130, 'number', '#ffffff', '#000000');
  }

  // ====== 3) twoDigits: 4x2 (ซ้ายกลางล่าง) ======
  // จากรูปจริง: อยู่ช่วงกลางภาพฝั่งซ้าย, ไม่ชนวงกลม
  {
    const rectX = W * 0.37;    // จุดศูนย์กลางของ grid (x)
    const rectY = H * 0.66;    // จุดศูนย์กลางของ grid (y)
    const rectW = W * 0.6;    // ความกว้างรวม grid
    const rectH = H * 0.25;    // ความสูงรวม grid

    const left = rectX - rectW / 2;
    const top  = rectY - rectH / 2;

    const cols = 4, rows = 2;
    const cellW = rectW / cols;
    const cellH = rectH / rows;

    for (let i = 0; i < this.twoDigits.length; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);

      const x = left + (c + 0.5) * cellW;
      const y = top  + (r + 0.5) * cellH;

      const fs = this.fitFontSize(ctx, this.twoDigits[i], cellW * 0.88, 86, 34, 900);
      drawOutlined(this.twoDigits[i], x, y, fs, 'number', '#ffffff', '#000000');
    }
  }

  // ====== 4) focus2: วางในวงกลมขวา ======
  // วงกลมจริงอยู่ช่วงขวากลางล่าง
  {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 190;

    drawOutlined(this.focus1, W * 0.815, H * 0.66, 170, 'focus', '#ffffff', '#000000');
    // drawOutlined(this.focus2, W * 0.78, H * 0.66, 190, 'focus', '#ffffff', '#000000');

    ctx.restore();
  }

  // ====== 5) DATE: วางบน "แถบทองล่าง" (ตรงกลางล่าง) ======
  {
    drawOutlined(this.dateText, W * 0.62, H * 0.91, 62, 'date', '#ffffff', '#000000');
  }

  // output
  const blob = await this.poster.toBlobWithTimeout(canvas, 2000);
  if (blob) return URL.createObjectURL(blob);
  return canvas.toDataURL('image/png');
}

}
