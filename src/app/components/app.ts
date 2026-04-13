import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { AuthTokenService } from '../services/auth-token.service';
import { OnboardingApiService } from '../services/onboarding-api.service';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly onboardingApi: OnboardingApiService,
    private readonly authTokenService: AuthTokenService,
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    void this.initializeAuthSession();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async initializeAuthSession(): Promise<void> {
    const { data, error } = await this.supabaseService.client.auth.getSession();
    if (error) {
      this.authTokenService.clear();
      await this.router.navigateByUrl('/onboarding');
      return;
    }

    await this.syncSessionToken(data.session?.access_token ?? null);

    this.supabaseService.client.auth
      .onAuthStateChange((_event, session) => {
        void this.syncSessionToken(session?.access_token ?? null);
      })
      .data.subscription;
  }

  private async syncSessionToken(accessToken: string | null): Promise<void> {
    if (accessToken) {
      this.authTokenService.save(accessToken);
      await this.routeByProfile();
      return;
    }

    this.authTokenService.clear();
    await this.router.navigateByUrl('/onboarding');
  }

  private async routeByProfile(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.onboardingApi.getMe().pipe(takeUntil(this.destroy$)));
      if (profile.display_name && profile.slug) {
        await this.router.navigateByUrl('/dashboard');
        return;
      }
      await this.router.navigateByUrl('/onboarding');
    } catch {
      await this.router.navigateByUrl('/onboarding');
    }
  }
}
