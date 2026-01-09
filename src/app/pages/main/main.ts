import { Component } from '@angular/core';
import { Header } from './header/header';

@Component({
  selector: 'app-main',
  standalone: true,
   imports: [Header],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main  {

}