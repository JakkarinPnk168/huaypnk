// app.routes.ts
import { Routes } from '@angular/router';
import { GroupHome } from './pages/group-home/group-home';
import { RandomTop } from './pages/random-top/random-top';
import { RandomMin } from './pages/random-min/random-min';
import { Main } from './pages/main/main';
import { RandomTaweekoon } from './pages/random-taweekoon/random-taweekoon';
import { RandomMahaheng } from './pages/random-mahaheng/random-mahaheng';

export const routes: Routes = [
  { path: '', component: Main },

  // บ้าน
  { path: 'top', component: GroupHome, data: { house: 'top' } },
  { path: 'min', component: GroupHome, data: { house: 'min' } },
  { path: 'taweekoon', component: GroupHome, data: { house: 'taweekoon' } },
  { path: 'mahaheng', component: GroupHome, data: { house: 'mahaheng' } },
  
  // random ของแต่ละบ้าน
  { path: 'top/random/:id', component: RandomTop },
  { path: 'min/random/:id', component: RandomMin },
  { path: 'taweekoon/random/:id', component: RandomTaweekoon },
  { path: 'mahaheng/random/:id', component: RandomMahaheng },

  { path: '**', redirectTo: '' },
];
