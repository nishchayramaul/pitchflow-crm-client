import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  leaving: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts.asObservable();

  success(message: string, title?: string, duration = 4000) {
    this._add('success', message, title, duration);
  }

  error(message: string, title?: string, duration = 5000) {
    this._add('error', message, title, duration);
  }

  warning(message: string, title?: string, duration = 4500) {
    this._add('warning', message, title, duration);
  }

  info(message: string, title?: string, duration = 4000) {
    this._add('info', message, title, duration);
  }

  dismiss(id: string): void {
    this._toasts.next(
      this._toasts.value.map(t => t.id === id ? { ...t, leaving: true } : t)
    );
    setTimeout(() => {
      this._toasts.next(this._toasts.value.filter(t => t.id !== id));
    }, 280);
  }

  private _add(type: ToastType, message: string, title?: string, duration = 4000): void {
    const id = crypto.randomUUID();
    this._toasts.next([...this._toasts.value, { id, type, message, title, duration, leaving: false }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
