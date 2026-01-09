import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Footer } from './footer/footer';
import { Header } from './header/header';


type BtnColor = 'green' | 'blue' | 'purple' | 'yellow' | 'red' | 'cyan';

type BtnItem = {
  id: number;         
  label: string;       
  color: BtnColor;
};

type Section = {
  title: string;
  items: BtnItem[];
};

@Component({
  selector: 'app-group-home',
  standalone: true,
   imports: [Header, CommonModule, Footer],
  templateUrl: './group-home.html',
  styleUrl: './group-home.scss',
})
export class GroupHome implements OnInit {
  constructor(private router: Router, private route: ActivatedRoute) {}

 house = 'top';

  private rawSections: { title: string; items: { label: string; color: BtnColor }[] }[] = [
    {
      title: 'หวยหุ้น',
      items: [
        { label: 'นิเคอิเช้า', color: 'blue' },
        { label: 'จีนเช้า', color: 'purple' },
        { label: 'ฮั่งเช้า', color: 'yellow' },
        { label: 'หุ้นไต้หวัน', color: 'blue' },
        { label: 'เกาหลี', color: 'yellow' },
        { label: 'นิเคอิบ่าย', color: 'red' },
        { label: 'จีนบ่าย', color: 'cyan' },
        { label: 'ฮั่งบ่าย', color: 'green' },
        { label: 'สิงคโปร์', color: 'red' },
        { label: 'ไทยเย็น', color: 'yellow' },
        { label: 'อินเดีย', color: 'cyan' },
        { label: 'อียิปต์', color: 'cyan' },
        { label: 'มาเลเซีย', color: 'yellow' },
        { label: '3รัฐ', color: 'red' },
        { label: 'รัสเซีย', color: 'red' },
        { label: 'อังกฤษ', color: 'red' },
        { label: 'เยอรมัน', color: 'red' },
      ],
    },
    {
      title: 'รวมหวยนอย',
      items: [
        { label: '3 นอยมัดรวม', color: 'green' },
        { label: 'ฮานอยพิเศษ', color: 'green' },
        { label: 'ฮานอยปกติ', color: 'green' },
        { label: 'ฮานอยvip', color: 'green' },
        { label: 'ฮานอยดึก', color: 'purple' },
        { label: 'ฮานอยโฮจิมิน', color: 'purple' },
        { label: 'ฮานอยเฉพาะกิจ', color: 'red' },
        { label: 'ฮานอยอาเซียน', color: 'red' },
        { label: 'ฮานอยสามัคคี', color: 'red' },
        { label: 'ฮานอยพัฒนา', color: 'red' },
        { label: 'ฮานอยดาวน์', color: 'cyan' },
        { label: 'ฮานอยเที่ยง', color: 'cyan' },
        { label: 'ฮานอยHD', color: 'red' },
        { label: 'ฮานอยสตาร์', color: 'red' },
        { label: 'ฮานอยTV', color: 'red' },
        { label: 'ฮานอยกาชาด', color: 'red' },
        { label: 'ฮานอยExtra', color: 'red' },
        { label: 'เวียดนามพิเศษ', color: 'yellow' },
        { label: 'เวียดนาม', color: 'yellow' },
        { label: 'เวียดนามvip', color: 'yellow' },
        { label: 'ฮานอยตรุษจีน', color: 'red' },
        { label: 'ฮานอยตรุษจีนพิเศษ', color: 'red' },
        { label: 'ฮานอยตรุษจีนวีไอพี', color: 'red' },
      ],
    },
    {
      title: 'รวมลาว',
      items: [
        { label: 'ลาวเวียงไซ', color: 'cyan' },
        { label: 'ลาวคำม่วน', color: 'cyan' },
        { label: 'ลาวสตาร์', color: 'cyan' },
        { label: 'ลาวพัฒนา', color: 'blue' },
        { label: 'ลาวสามัคคี', color: 'red' },
        { label: 'ลาวvip', color: 'purple' },
        { label: 'ลาวเช้า', color: 'blue' },
        { label: 'ลาวเที่ยง', color: 'blue' },
        { label: 'ลาวอาเซียน', color: 'blue' },
        { label: 'ลาวextra', color: 'blue' },
        { label: 'ลาวมิตรภาพ', color: 'blue' },
        { label: 'ลาวสามัคคีvip', color: 'red' },
        { label: 'ลาวทดแทน', color: 'blue' },
        { label: 'ลาวนิยม', color: 'blue' },
        { label: 'ลาวดาว', color: 'blue' },
        { label: 'ลาวTV', color: 'blue' },
        { label: 'ลาวHD', color: 'blue' },
        { label: 'ลาวพิเศษ', color: 'blue' },
        { label: 'ลาวสตาร์vip', color: 'blue' },
        { label: 'ลาวเวียงจัน', color: 'blue' },
        { label: 'ลาวกาชาด', color: 'blue' },
      ],
    },
    {
      title: 'ดาวโจนส์',
      items: [
        { label: 'ดาวvip+ดาวสตาร์', color: 'red' },
        { label: 'ดาวโจนvip', color: 'purple' },
        { label: 'ดาวโจนstar', color: 'purple' },
        { label: 'ดาวโจนพิเศษ', color: 'purple' },
        { label: 'ดาวโจน', color: 'cyan' },
        { label: 'ยูโร', color: 'yellow' },
      ],
    },
    {
      title: 'ไทย',
      items: [
        { label: 'รัฐบาลไทย', color: 'yellow' },
        { label: 'ออมสิน', color: 'yellow' },
        { label: 'ธกส', color: 'yellow' },
      ],
    },
    {
      title: 'หุ้น VIP',
      items: [
        { label: 'นิเคอิเช้าvip', color: 'blue' },
        { label: 'จีนเช้าvip', color: 'purple' },
        { label: 'ฮั่งเช้าvip', color: 'yellow' },
        { label: 'หุ้นไต้หวันvip', color: 'blue' },
        { label: 'เกาหลีvip', color: 'yellow' },
        { label: 'นิเคอิบ่ายvip', color: 'red' },
        { label: 'จีนบ่ายvip', color: 'cyan' },
        { label: 'ฮั่งบ่ายvip', color: 'green' },
        { label: 'สิงคโปร์vip', color: 'red' },
        { label: 'ลาวสามัคคีvip', color: 'red' },
        { label: 'รัสเซียvip', color: 'red' },
        { label: 'อังกฤษvip', color: 'red' },
        { label: 'เยอรมันvip', color: 'red' },
        { label: '3รัฐvip', color: 'red' },
      ],
    },
    {
      title: 'หุ้นไทยพิเศษ',
      items: [
        { label: 'หุ้นไทยพิเศษรอบเช้า', color: 'yellow' },
        { label: 'หุ้นไทยพิเศษรอบเที่ยง', color: 'yellow' },
        { label: 'หุ้นไทยพิเศษรอบบ่าย', color: 'yellow' },
        { label: 'หุ้นไทยพิเศษรอบเย็น', color: 'yellow' },
        { label: 'หุ้นไทยพิเศษรอบค่ำ', color: 'yellow' },
        { label: 'หุ้นไทยพิเศษรอบดึก', color: 'yellow' },
        { label: 'ไทยเช้าvip', color: 'yellow' },
        { label: 'ไทยบ่ายvip', color: 'yellow' },
        { label: 'ไทยเย็นvip', color: 'yellow' },
      ],
    },
    {
      title: 'หุ้น Plus',
      items: [
        { label: 'นิเคอิเช้า Plus', color: 'purple' },
        { label: 'จีนเช้า Plus', color: 'purple' },
        { label: 'ฮั่งเช้า Plus', color: 'purple' },
        { label: 'หุ้นไต้หวัน Plus', color: 'purple' },
        { label: 'เกาหลี Plus', color: 'purple' },
        { label: 'นิเคอิบ่าย Plus', color: 'purple' },
        { label: 'จีนบ่าย Plus', color: 'purple' },
        { label: 'ฮั่งบ่าย Plus', color: 'purple' },
        { label: 'สิงคโปร์ Plus', color: 'purple' },
        { label: 'รัสเซีย Plus', color: 'purple' },
        { label: 'อังกฤษ Plus', color: 'purple' },
        { label: 'เยอรมัน Plus', color: 'purple' },
        { label: 'ดาวโจนส์ Plus', color: 'purple' },
      ],
    },
  ];


  sections: Section[] = [];
  private idMap = new Map<number, BtnItem>();

  ngOnInit() {
    // 1) สร้างปุ่มเหมือนเดิม
    let idCounter = 1;
    this.sections = this.rawSections.map((sec) => {
      const items: BtnItem[] = sec.items.map((it) => {
        const btn: BtnItem = { id: idCounter++, label: it.label, color: it.color };
        this.idMap.set(btn.id, btn);
        return btn;
      });
      return { title: sec.title, items };
    });

    // ✅ 2) อ่านบ้านจาก route data (ตั้งไว้ใน routes: data:{house:'top'})
    this.route.data.subscribe((d) => {
      this.house = (d['house'] ?? 'top') as string;
    });
  }

  onClick(item: BtnItem) {
    // ✅ ไปหน้า random ของบ้านนั้น
    this.router.navigate([`/${this.house}/random`, item.id], {
      queryParams: { title: item.label },
    });
  }
}