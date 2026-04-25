import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-gray-900">404</h1>
        <p class="mt-4 text-xl text-gray-600">Page not found</p>
        <p class="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
        <button 
          class="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          (click)="goHome()">
          Go Home
        </button>
      </div>
    </div>
  `
})
export class NotFoundPageComponent {
  constructor(private router: Router) {}

  goHome() {
    this.router.navigate(['/dashboard']);
  }
}