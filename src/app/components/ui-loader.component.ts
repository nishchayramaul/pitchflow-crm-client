import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="loader-backdrop"
      [class.fullscreen]="fullscreen"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="loader-card">
        <span class="loader-spinner" aria-hidden="true"></span>
        <p>{{ message }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .loader-backdrop {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(2px);
        border-radius: 18px;
      }

      .loader-backdrop.fullscreen {
        position: fixed;
        border-radius: 0;
        z-index: 9999;
      }

      .loader-card {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        background: #202020;
        border: 1px solid #333;
        border-radius: 10px;
        padding: 0.6rem 0.85rem;
      }

      .loader-card p {
        margin: 0;
        font-size: 0.9rem;
        color: #f2f2f2;
      }

      .loader-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #4b4b4b;
        border-top-color: #f5f5f5;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `
  ]
})
export class UiLoaderComponent {
  @Input() message = 'Please wait...';
  @Input() fullscreen = false;
}
