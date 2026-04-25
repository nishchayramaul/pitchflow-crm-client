import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthSessionService } from '../../services/auth-session.service';
import { ProfileStateFacade } from '../../services/profile-state.facade';
import sidenavConfig from '../../config/sidenav.config.json';

interface SidenavIcon {
  url?: string;
  path?: string;
  name: string;
}

interface SidenavItem {
  label: string;
  name: string;
  url: string;
  icon: SidenavIcon;
}

interface SidenavConfig {
  logo: SidenavIcon;
  items: SidenavItem[];
}

@Component({
  selector: 'app-sidenav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss'
})
export class SidenavComponent implements OnInit {
  isCollapsed = false;
  config: SidenavConfig = sidenavConfig;

  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly profileStateFacade: ProfileStateFacade,
    private readonly router: Router
  ) {}

  ngOnInit(): void {}

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  async signOut(): Promise<void> {
    await this.authSessionService.signOut();
    this.profileStateFacade.clearProfileLoadStateCache();
    await this.router.navigateByUrl('/onboarding');
  }
}
