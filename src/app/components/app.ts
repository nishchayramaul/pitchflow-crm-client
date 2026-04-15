import { CommonModule } from '@angular/common';
import { AuthChangeEvent } from '@supabase/supabase-js';
import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { UiLoaderComponent } from './ui-loader.component';
import { LoaderService } from '../services/loader.service';
import { ProfileStateFacade } from '../services/profile-state.facade';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, UiLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private authStateSubscription?: { unsubscribe: () => void };
  private lastSyncedToken = '';

  constructor(
    private readonly profileStateFacade: ProfileStateFacade,
    private readonly router: Router,
    private readonly ngZone: NgZone,
    readonly loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    void this.initializeAuthSession();
  }

  ngOnDestroy(): void {
    this.authStateSubscription?.unsubscribe();
  }

  private async initializeAuthSession(): Promise<void> {
    const session = await this.loaderService.trackPromise(
      this.profileStateFacade.getSession(),
      'Restoring session...'
    );
    await this.ngZone.run(() => this.syncSessionToken(session?.access_token ?? null, 'INITIAL_SESSION'));

    const authStateChange = this.profileStateFacade.onAuthStateChange((event, session) => {
      void this.ngZone.run(() => this.syncSessionToken(session?.access_token ?? null, event));
    });
    this.authStateSubscription = authStateChange;
  }

  private async syncSessionToken(accessToken: string | null, event: AuthChangeEvent): Promise<void> {
    // Supabase emits INITIAL_SESSION on listener registration; skip duplicate work.
    if (event === 'INITIAL_SESSION' && this.lastSyncedToken === (accessToken ?? '')) {
      return;
    }

    if (accessToken) {
      this.lastSyncedToken = accessToken;
      await this.routeByProfile();
      return;
    }

    this.lastSyncedToken = '';
    this.profileStateFacade.clearProfileLoadStateCache();
    await this.ngZone.run(() => this.router.navigateByUrl('/onboarding'));
  }

  private async routeByProfile(): Promise<void> {
    const profileState = await this.profileStateFacade.getProfileLoadState(true);
    const targetRoute = profileState.status === 'complete' ? '/dashboard' : '/onboarding';
    await this.ngZone.run(() => this.router.navigateByUrl(targetRoute));
  }
}
