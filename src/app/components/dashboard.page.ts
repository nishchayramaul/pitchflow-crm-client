import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../services/supabase.service';
import { AuthTokenService } from '../services/auth-token.service';
import { OnboardingApiService } from '../services/onboarding-api.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPageComponent implements OnInit {
  displayName = '';
  profileUrl = '';
  loadError = '';
  copied = false;

  constructor(
    private readonly onboardingApi: OnboardingApiService,
    private readonly authTokenService: AuthTokenService,
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    void this.loadProfile();
  }

  async signOut(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
    this.authTokenService.clear();
    await this.router.navigateByUrl('/onboarding');
  }

  async copyLink(): Promise<void> {
    if (!this.profileUrl) {
      return;
    }
    await navigator.clipboard.writeText(this.profileUrl);
    this.copied = true;
    setTimeout(() => {
      this.copied = false;
    }, 1200);
  }

  private async loadProfile(): Promise<void> {
    try {
      const profile = await firstValueFrom(this.onboardingApi.getMe());
      if (!profile.display_name || !profile.slug) {
        await this.router.navigateByUrl('/onboarding');
        return;
      }

      this.displayName = profile.display_name;
      this.profileUrl = `pitchflow.in/${profile.slug}`;
    } catch (error: any) {
      this.loadError = error?.error?.detail ?? 'Unable to load profile.';
    }
  }
}
