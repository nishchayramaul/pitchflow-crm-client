import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthSessionService } from '../services/auth-session.service';
import { CurrencyService } from '../services/currency.service';
import { OnboardingApiService } from '../services/onboarding-api.service';
import { ProfileStateFacade } from '../services/profile-state.facade';
import { SidenavComponent } from './sidenav/sidenav.component';

interface StatCard {
  label: string;
  value: string;
  sub: string;
  colorClass: string;
}

const TILE_HUES = [35, 220, 155, 280, 40, 200];
function brandTile(name: string, index: number): { color: string; initial: string } {
  const hue = TILE_HUES[index % TILE_HUES.length];
  return {
    color: `linear-gradient(135deg, oklch(0.78 0.10 ${hue}), oklch(0.62 0.13 ${hue}))`,
    initial: (name || '?').charAt(0).toUpperCase()
  };
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule, SidenavComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss'
})
export class DashboardPageComponent implements OnInit {
  displayName = '';
  firstName = '';
  profileUrl = '';
  loadError = '';
  copied = false;
  tier: 'free' | 'pro' = 'free';

  timeOfDay = 'morning';

  stats: StatCard[] = [
    { label: 'Pending pitches', value: '—', sub: 'Need a response', colorClass: 'amber' },
    { label: 'In talks',        value: '—', sub: 'Negotiating',      colorClass: 'blue'  },
    { label: 'Closed this mo.', value: '—', sub: 'Completed',        colorClass: 'green' },
    { label: 'Pipeline value',  value: '—', sub: 'Active deals',     colorClass: ''      },
  ];

  recentLeads: any[] = [];

  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly router: Router,
    private readonly profileStateFacade: ProfileStateFacade,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly currencyService: CurrencyService,
    private readonly api: OnboardingApiService
  ) {}

  get currencySymbol(): string { return this.currencyService.symbol; }

  ngOnInit(): void {
    const h = new Date().getHours();
    this.timeOfDay = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    void this.loadProfile();
    void this.loadCurrency();
  }

  async copyLink(): Promise<void> {
    if (!this.profileUrl) return;
    await navigator.clipboard.writeText(`https://${this.profileUrl}`);
    this.copied = true;
    setTimeout(() => { this.copied = false; this.cdr.detectChanges(); }, 1500);
  }

  upgradeToPro(): void {
    this.tier = 'pro';
    this.cdr.detectChanges();
  }

  private async loadCurrency(): Promise<void> {
    try {
      const [profile, leadsResp] = await Promise.all([
        firstValueFrom(this.api.getMe()),
        firstValueFrom(this.api.getLeads({ page_size: 200 })),
      ]);

      this.currencyService.set(profile.currency ?? leadsResp.currency ?? 'USD');
      this.tier = profile.tier ?? 'free';
      const sym = this.currencyService.symbol;
      const leads = leadsResp.items;

      const now = new Date();
      const pending     = leads.filter(l => l.status === 'pending').length;
      const negotiating = leads.filter(l => l.status === 'negotiating').length;
      const closedMonth = leads.filter(l => {
        if (l.status !== 'completed') return false;
        const d = new Date(l.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;
      const pipeline = leads
        .filter(l => l.status === 'pending' || l.status === 'negotiating')
        .reduce((sum, l) => sum + (l.budget ?? 0), 0);

      const fmtPipeline = pipeline >= 1000
        ? `${sym}${Math.round(pipeline / 1000)}K`
        : `${sym}${pipeline}`;

      this.stats[0].value = String(pending);
      this.stats[1].value = String(negotiating);
      this.stats[2].value = String(closedMonth);
      this.stats[3].value = pipeline > 0 ? fmtPipeline : '—';

      this.recentLeads = leads.slice(0, 5).map((l, i) => {
        const name = l.custom_responses?.['brand_name'] || l.brand_name || 'Unknown';
        return { ...l, brand_name: name, ...brandTile(name, i) };
      });

      this.cdr.detectChanges();
    } catch { /* non-critical */ }
  }

  private async loadProfile(): Promise<void> {
    const profileState = await this.profileStateFacade.getProfileLoadState();

    if (profileState.status === 'incomplete') {
      await this.ngZone.run(() => this.router.navigateByUrl('/onboarding'));
      return;
    }

    this.ngZone.run(() => {
      this.displayName = profileState.displayName;
      this.firstName = this.displayName.split(' ')[0];
      this.profileUrl = profileState.profileUrl;
      this.loadError = profileState.error;
      this.cdr.detectChanges();
    });
  }
}
