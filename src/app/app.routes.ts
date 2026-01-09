// app.routes.ts
import { Routes } from '@angular/router';
import { GroupHome } from './pages/group-home/group-home';
import { RandomTop } from './pages/random-top/random-top';
import { RandomMin } from './pages/random-min/random-min';
import { Main } from './pages/main/main';

export const routes: Routes = [
  { path: '', component: Main },

  // บ้าน
  { path: 'top', component: GroupHome, data: { house: 'top' } },
  { path: 'min', component: GroupHome, data: { house: 'min' } },

  // random ของแต่ละบ้าน
  { path: 'top/random/:id', component: RandomTop },
  { path: 'min/random/:id', component: RandomMin },

  { path: '**', redirectTo: '' },
];
