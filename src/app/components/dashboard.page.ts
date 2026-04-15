import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';
import { ProfileStateFacade } from '../services/profile-state.facade';

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
    private readonly authSessionService: AuthSessionService,
    private readonly router: Router,
    private readonly profileStateFacade: ProfileStateFacade,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadProfile();
  }

  async signOut(): Promise<void> {
    await this.authSessionService.signOut();
    this.profileStateFacade.clearProfileLoadStateCache();
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
    const profileState = await this.profileStateFacade.getProfileLoadState();

    if (profileState.status === 'incomplete') {
      await this.ngZone.run(() => this.router.navigateByUrl('/onboarding'));
      return;
    }

    this.ngZone.run(() => {
      this.displayName = profileState.displayName;
      this.profileUrl = profileState.profileUrl;
      this.loadError = profileState.error;
      this.cdr.detectChanges();
    });
  }
}
