import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthSessionService } from '../../services/auth-session.service';
import { ProfileStateFacade } from '../../services/profile-state.facade';

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss'
})
export class SidenavComponent implements OnInit {
  displayName = '';
  slug = '';
  initial = '';

  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly profileStateFacade: ProfileStateFacade,
    private readonly router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const state = await this.profileStateFacade.getProfileLoadState();
      if (state.status === 'complete') {
        this.displayName = state.displayName;
        this.slug = state.profileUrl.replace('pitchflow.in/', '');
        this.initial = this.displayName.charAt(0).toUpperCase();
      }
    } catch { /* non-critical */ }
  }

  async signOut(): Promise<void> {
    await this.authSessionService.signOut();
    this.profileStateFacade.clearProfileLoadStateCache();
    await this.router.navigateByUrl('/onboarding');
  }
}
