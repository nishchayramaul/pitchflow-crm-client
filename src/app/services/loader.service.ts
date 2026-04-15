import { Injectable, computed, signal } from '@angular/core';
import { defer, finalize, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoaderService {
  private readonly activeCount = signal(0);
  private readonly currentMessage = signal('Please wait...');

  readonly isVisible = computed(() => this.activeCount() > 0);
  readonly message = computed(() => this.currentMessage());

  show(message = 'Please wait...'): () => void {
    this.currentMessage.set(message);
    this.activeCount.update((value) => value + 1);

    let closed = false;
    return () => {
      if (closed) {
        return;
      }
      closed = true;
      this.activeCount.update((value) => Math.max(0, value - 1));
    };
  }

  async trackPromise<T>(promise: Promise<T>, message = 'Please wait...'): Promise<T> {
    const done = this.show(message);
    try {
      return await promise;
    } finally {
      done();
    }
  }

  trackObservable<T>(source$: Observable<T>, message = 'Please wait...'): Observable<T> {
    return defer(() => {
      const done = this.show(message);
      return source$.pipe(finalize(() => done()));
    });
  }
}
