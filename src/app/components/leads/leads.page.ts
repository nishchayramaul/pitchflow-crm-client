import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CurrencyService } from '../../services/currency.service';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { SidenavComponent } from '../sidenav/sidenav.component';

const STATUS_TABS = ['All', 'Pending', 'Negotiating', 'Completed', 'Rejected'] as const;
const ALL_STATUSES = ['pending', 'negotiating', 'completed', 'rejected'] as const;
const TILE_HUES = [35, 220, 155, 280, 40, 200, 320, 60];

function tileColor(name: string, index: number): string {
  const hue = TILE_HUES[index % TILE_HUES.length];
  return `linear-gradient(135deg, oklch(0.78 0.10 ${hue}), oklch(0.62 0.13 ${hue}))`;
}

function enrichLead(lead: any, index: number): any {
  const name = lead.custom_responses?.['brand_name'] || lead.brand_name || '?';
  return {
    ...lead,
    tileColor: tileColor(name, index),
    initial: name.charAt(0).toUpperCase(),
  };
}

@Component({
  selector: 'app-leads-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidenavComponent],
  templateUrl: './leads.page.html',
  styleUrl: './leads.page.scss'
})
export class LeadsPageComponent implements OnInit {
  readonly statusTabs = STATUS_TABS;
  readonly allStatuses = ALL_STATUSES;
  readonly skeletonRows = Array(5).fill(null);

  leads: any[] = [];
  filteredLeads: any[] = [];

  activeTab = 'All';
  searchQuery = '';
  isLoading = true;

  selectedIds = new Set<string>();
  openLeadId: string | null = null;
  statusDdOpen: string | null = null;

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  minimumBudget = 0;

  constructor(
    private readonly currencyService: CurrencyService,
    private readonly api: OnboardingApiService,
  ) {}

  get currencySymbol(): string { return this.currencyService.symbol; }

  get pendingCount(): number {
    return this.leads.filter(l => l.status === 'pending').length;
  }

  get selectedLead(): any {
    return this.leads.find(l => l.id === this.openLeadId) ?? null;
  }

  get isAllSelected(): boolean {
    return this.filteredLeads.length > 0 &&
           this.filteredLeads.every(l => this.selectedIds.has(l.id));
  }

  get isIndeterminate(): boolean {
    return this.selectedIds.size > 0 && !this.isAllSelected;
  }

  get paginatedLeads(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLeads.slice(start, start + this.pageSize);
  }

  get showingText(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredLeads.length);
    return `Showing ${start}–${end} of ${this.filteredLeads.length}`;
  }

  get drawerFields(): { label: string; value: string }[] {
    if (!this.selectedLead) return [];
    const resp = this.selectedLead.custom_responses ?? {};
    const skip = new Set(['brand_name', 'brand_email', 'budget']);
    return Object.entries(resp)
      .filter(([k]) => !skip.has(k))
      .map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: String(v ?? '') }));
  }

  ngOnInit(): void {
    this.loadLeads();
  }

  private async loadLeads(): Promise<void> {
    this.isLoading = true;
    try {
      const resp = await firstValueFrom(this.api.getLeads({ page_size: 200 }));
      this.minimumBudget = resp.minimum_budget ?? 0;
      if (resp.currency) {
        this.currencyService.set(resp.currency);
      }
      this.leads = resp.items.map((l, i) => enrichLead(l, i));
      this.applyFilters();
    } catch {
      this.leads = [];
      this.applyFilters();
    } finally {
      this.isLoading = false;
    }
  }

  tabCount(tab: string): number {
    if (tab === 'All') return this.leads.length;
    return this.leads.filter(l => l.status === tab.toLowerCase()).length;
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.selectedIds.clear();
    this.applyFilters();
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredLeads = this.leads.filter(l => {
      const tabMatch = this.activeTab === 'All' || l.status === this.activeTab.toLowerCase();
      if (!tabMatch) return false;
      if (!q) return true;
      const name = (l.custom_responses?.['brand_name'] || l.brand_name || '').toLowerCase();
      const email = (l.custom_responses?.['brand_email'] || l.brand_email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
    this.totalPages = Math.max(1, Math.ceil(this.filteredLeads.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  toggleSelect(id: string): void {
    const s = new Set(this.selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds = s;
  }

  toggleAll(): void {
    if (this.isAllSelected) {
      this.selectedIds = new Set();
    } else {
      this.selectedIds = new Set(this.filteredLeads.map(l => l.id));
    }
  }

  clearSelection(): void {
    this.selectedIds = new Set();
  }

  bulkSetStatus(status: string): void {
    this.leads = this.leads.map(l =>
      this.selectedIds.has(l.id) ? { ...l, status } : l
    );
    this.selectedIds = new Set();
    this.applyFilters();
  }

  openLead(lead: any): void {
    this.openLeadId = lead.id;
    this.statusDdOpen = null;
  }

  closeLead(): void {
    this.openLeadId = null;
    this.statusDdOpen = null;
  }

  toggleStatusDd(id: string, event: Event): void {
    event.stopPropagation();
    this.statusDdOpen = this.statusDdOpen === id ? null : id;
  }

  setStatus(lead: any, status: string): void {
    // Optimistic update
    this.leads = this.leads.map(l => l.id === lead.id ? { ...l, status } : l);
    this.applyFilters();
    this.statusDdOpen = null;

    firstValueFrom(this.api.updateLeadStatus(lead.id, { status })).catch(() => {
      // Revert on failure
      this.leads = this.leads.map(l => l.id === lead.id ? { ...l, status: lead.status } : l);
      this.applyFilters();
    });
  }

  isFlagged(lead: any): boolean {
    return this.minimumBudget > 0 && lead.budget > 0 && lead.budget < this.minimumBudget;
  }

  prevPage(): void { if (this.currentPage > 1) this.currentPage--; }
  nextPage(): void { if (this.currentPage < this.totalPages) this.currentPage++; }

  formatRel(iso: string): string {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.statusDdOpen) this.statusDdOpen = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.openLeadId) { this.closeLead(); return; }
    if (this.statusDdOpen) this.statusDdOpen = null;
  }
}
