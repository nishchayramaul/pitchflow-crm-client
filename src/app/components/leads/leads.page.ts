import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { FormField } from '../../models/api.models';
import { SidenavComponent } from '../sidenav/sidenav.component';

const STATUS_TABS = ['All', 'Pending', 'Negotiating', 'Completed', 'Rejected'] as const;

@Component({
  selector: 'app-leads-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule, SidenavComponent],
  templateUrl: './leads.page.html',
  styleUrl: './leads.page.scss'
})
export class LeadsPageComponent implements OnInit {
  readonly statusTabs = STATUS_TABS;
  readonly skeletonRows = Array(5).fill(null);

  formSchema: FormField[] = [];
  leads: any[] = [];
  filteredLeads: any[] = [];

  activeTab = 'All';
  selectedLead: any = null;
  isLoading = true;

  filters: { [key: string]: string } = {};

  currentPage = 1;
  pageSize = 5;
  totalPages = 1;

  ngOnInit() {
    this.formSchema = [
      { id: 'field_1', type: 'text', label: 'Brand Name', required: true },
      { id: 'field_2', type: 'select', label: 'Deliverables', required: true, options: ['1 YouTube Video', 'Instagram Reel'] },
      { id: 'field_3', type: 'textarea', label: 'Project Details', required: false }
    ];

    this.leads = [
      { id: 'lead_1', status: 'pending',     budget: 5000,  custom_responses: { field_1: 'Nike',         field_2: '1 YouTube Video', field_3: 'Summer campaign' } },
      { id: 'lead_2', status: 'negotiating', budget: 3000,  custom_responses: { field_1: 'Adidas',       field_2: 'Instagram Reel',  field_3: 'Shoe launch' } },
      { id: 'lead_3', status: 'completed',   budget: 8000,  custom_responses: { field_1: 'Puma',         field_2: '1 YouTube Video', field_3: 'Sponsorship' } },
      { id: 'lead_4', status: 'rejected',    budget: 1000,  custom_responses: { field_1: 'Reebok',       field_2: 'Instagram Reel',  field_3: 'Short term' } },
      { id: 'lead_5', status: 'pending',     budget: 12000, custom_responses: { field_1: 'Under Armour', field_2: '1 YouTube Video', field_3: 'Long term' } },
      { id: 'lead_6', status: 'negotiating', budget: 6000,  custom_responses: { field_1: 'Gymshark',     field_2: 'Instagram Reel',  field_3: 'Clothing' } },
    ];

    setTimeout(() => {
      this.isLoading = false;
      this.applyFilters();
    }, 800);
  }

  setTab(tab: string) {
    this.activeTab = tab;
    this.currentPage = 1;
    this.applyFilters();
  }

  tabCount(tab: string): number {
    if (tab === 'All') return this.leads.length;
    return this.leads.filter(l => l.status === tab.toLowerCase()).length;
  }

  selectLead(lead: any) {
    this.selectedLead = lead;
  }

  closeLead() {
    this.selectedLead = null;
  }

  dropColumn(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.formSchema, event.previousIndex, event.currentIndex);
  }

  onFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredLeads = this.leads.filter(lead => {
      if (this.activeTab !== 'All' && lead.status !== this.activeTab.toLowerCase()) {
        return false;
      }
      for (const field of this.formSchema) {
        const filterVal = this.filters[field.id]?.toLowerCase();
        if (filterVal) {
          const leadVal = (lead.custom_responses[field.id] || '').toString().toLowerCase();
          if (!leadVal.includes(filterVal)) return false;
        }
      }
      return true;
    });

    this.totalPages = Math.ceil(this.filteredLeads.length / this.pageSize);
  }

  get paginatedLeads() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLeads.slice(start, start + this.pageSize);
  }

  get showingText(): string {
    if (this.filteredLeads.length === 0) return 'No leads found';
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.filteredLeads.length);
    return `Showing ${start}–${end} of ${this.filteredLeads.length} leads`;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }
}
