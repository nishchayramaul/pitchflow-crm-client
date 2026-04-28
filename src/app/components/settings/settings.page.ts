import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { FormField } from '../../models/api.models';
import { CurrencyService } from '../../services/currency.service';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { ToastService } from '../../services/toast.service';
import { CurrencyPickerComponent } from '../currency-picker/currency-picker.component';
import { SidenavComponent } from '../sidenav/sidenav.component';

const DEFAULT_FIELDS: FormField[] = [
  { id: 'brand_name',  type: 'text',   label: 'Brand Name',  required: true, placeholder: 'Your brand or company name' },
  { id: 'brand_email', type: 'email',  label: 'Brand Email', required: true, placeholder: 'contact@brand.com' },
  { id: 'budget',      type: 'number', label: 'Budget',      required: true, placeholder: 'e.g. 5000' },
];

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule, SidenavComponent, CurrencyPickerComponent],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss'
})
export class SettingsPageComponent implements OnInit {
  formSchema: FormField[] = [];
  tier: 'free' | 'pro' = 'free';

  activeSettingsTab: 'form' | 'currency' | 'budget' | 'account' = 'form';
  settingsTabs: { id: 'form' | 'currency' | 'budget' | 'account'; label: string }[] = [
    { id: 'form',     label: 'Form builder'    },
    { id: 'currency', label: 'Currency'        },
    { id: 'budget',   label: 'Minimum budget'  },
    { id: 'account',  label: 'Account'         },
  ];

  showAddPanel = false;

  accountName  = '';
  accountEmail = '';
  accountInitial = '';

  budgetExamples = [
    { name: 'Nike',   amount: 5000,  init: 'N', color: 'linear-gradient(135deg,oklch(0.78 0.10 35),oklch(0.62 0.13 35))' },
    { name: 'Adidas', amount: 1200,  init: 'A', color: 'linear-gradient(135deg,oklch(0.78 0.10 220),oklch(0.62 0.13 220))' },
    { name: 'Puma',   amount: 800,   init: 'P', color: 'linear-gradient(135deg,oklch(0.78 0.10 155),oklch(0.62 0.13 155))' },
  ];

  newFieldForm: FormGroup;
  fieldTypes = ['text', 'email', 'textarea', 'number', 'select', 'radio', 'checkbox', 'file'];

  // Options editor state for the "add field" panel
  draftOptions: string[] = ['', ''];
  draftMultiselect = true;

  // Inline edit state
  editingIndex: number | null = null;
  editBuffer: { label: string; required: boolean; options: string[]; multiselect: boolean } = {
    label: '', required: false, options: [], multiselect: true
  };

  saveLoading = false;

  minimumBudget: number | null = null;
  budgetSaving = false;

  selectedCurrency = 'USD';
  currencySaving = false;

  private readonly optionTypes = ['select', 'radio', 'checkbox'];

  get currencySymbol(): string { return this.currencyService.symbol; }

  constructor(
    private api: OnboardingApiService,
    private fb: FormBuilder,
    private toast: ToastService,
    private currencyService: CurrencyService
  ) {
    this.newFieldForm = this.fb.group({
      type: ['text', Validators.required],
      label: ['', Validators.required],
      required: [false],
      placeholder: ['']
    });
  }

  async ngOnInit() {
    try {
      const profile = await firstValueFrom(this.api.getMe());
      this.tier = profile.tier ?? 'free';
      this.formSchema = (profile.form_schema && profile.form_schema.length > 0)
        ? profile.form_schema
        : [...DEFAULT_FIELDS];
      this.minimumBudget = profile.minimum_budget ?? null;
      this.selectedCurrency = profile.currency ?? 'USD';
      this.currencyService.set(this.selectedCurrency);
      this.accountName    = profile.display_name ?? '';
      this.accountEmail   = profile.email        ?? '';
      this.accountInitial = this.accountName.charAt(0).toUpperCase() || 'U';
    } catch (err: any) {
      this.toast.error(err?.error?.detail ?? 'Could not load form configuration.', 'Load Failed');
    }
  }

  get needsOptions(): boolean {
    return this.optionTypes.includes(this.newFieldForm.get('type')?.value);
  }

  get isCheckboxType(): boolean {
    return this.newFieldForm.get('type')?.value === 'checkbox';
  }

  onTypeChange() {
    this.draftOptions = ['', ''];
    this.draftMultiselect = true;
  }

  // trackBy prevents DOM node recreation on each change detection cycle,
  // which is the root cause of the cross-input state bleed bug.
  trackByIndex(index: number): number {
    return index;
  }

  addDraftOption() {
    this.draftOptions = [...this.draftOptions, ''];
  }

  removeDraftOption(i: number) {
    this.draftOptions = this.draftOptions.filter((_, idx) => idx !== i);
  }

  addField() {
    if (this.newFieldForm.invalid) return;

    const val = this.newFieldForm.value;
    const newField: FormField = {
      id: 'field_' + Date.now(),
      type: val.type,
      label: val.label,
      required: val.required,
      placeholder: val.placeholder || undefined
    };

    if (this.needsOptions) {
      const filled = this.draftOptions.filter(o => o.trim() !== '');
      newField.options = filled.length > 0 ? filled : ['Option 1', 'Option 2'];
    }

    if (val.type === 'checkbox') {
      newField.multiselect = this.draftMultiselect;
    }

    this.formSchema = [...this.formSchema, newField];
    this.newFieldForm.reset({ type: 'text', required: false });
    this.draftOptions = ['', ''];
    this.draftMultiselect = true;
  }

  deleteField(index: number) {
    if (this.editingIndex === index) this.editingIndex = null;
    this.formSchema = this.formSchema.filter((_, i) => i !== index);
  }

  startEdit(index: number) {
    const field = this.formSchema[index];
    this.editBuffer = {
      label: field.label,
      required: field.required,
      options: field.options ? [...field.options] : [],
      multiselect: field.multiselect !== false
    };
    this.editingIndex = index;
  }

  cancelEdit() {
    this.editingIndex = null;
  }

  saveEdit() {
    if (this.editingIndex === null) return;
    const updated = [...this.formSchema];
    const field = { ...updated[this.editingIndex] };

    field.label = this.editBuffer.label.trim() || field.label;
    field.required = this.editBuffer.required;

    if (field.options !== undefined) {
      const filled = this.editBuffer.options.filter(o => o.trim() !== '');
      field.options = filled.length > 0 ? filled : field.options;
    }

    if (field.type === 'checkbox') {
      field.multiselect = this.editBuffer.multiselect;
    }

    updated[this.editingIndex] = field;
    this.formSchema = updated;
    this.editingIndex = null;
  }

  addEditOption() {
    this.editBuffer = { ...this.editBuffer, options: [...this.editBuffer.options, ''] };
  }

  removeEditOption(i: number) {
    this.editBuffer = {
      ...this.editBuffer,
      options: this.editBuffer.options.filter((_, idx) => idx !== i)
    };
  }

  fieldHasOptions(field: FormField): boolean {
    return this.optionTypes.includes(field.type);
  }

  drop(event: CdkDragDrop<FormField[]>) {
    this.editingIndex = null;
    const updated = [...this.formSchema];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    this.formSchema = updated;
  }

  async saveSchema() {
    this.saveLoading = true;
    try {
      await firstValueFrom(this.api.updateFormSchema(this.formSchema));
      this.toast.success('Your pitch form has been updated.', 'Form Saved');
    } catch (err: any) {
      this.toast.error(err?.error?.detail ?? 'Failed to save. Please try again.', 'Save Failed');
    } finally {
      this.saveLoading = false;
    }
  }

  upgradeToPro() {
    this.tier = 'pro';
  }

  onCurrencyChange(code: string): void {
    this.selectedCurrency = code;
    this.currencyService.set(code);
  }

  async saveCurrency(): Promise<void> {
    this.currencySaving = true;
    try {
      await firstValueFrom(this.api.updateCurrency(this.selectedCurrency));
      this.toast.success(`Currency set to ${this.selectedCurrency}.`, 'Saved');
    } catch (err: any) {
      this.toast.error(err?.error?.detail ?? 'Failed to save currency.', 'Save Failed');
    } finally {
      this.currencySaving = false;
    }
  }

  async saveMinimumBudget() {
    if (this.minimumBudget === null || this.minimumBudget < 0) return;
    this.budgetSaving = true;
    try {
      await firstValueFrom(this.api.updateMinimumBudget(this.minimumBudget));
      this.toast.success('Minimum budget updated.', 'Saved');
    } catch (err: any) {
      this.toast.error(err?.error?.detail ?? 'Failed to save. Please try again.', 'Save Failed');
    } finally {
      this.budgetSaving = false;
    }
  }

  onBudgetKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      void this.saveMinimumBudget();
    }
  }
}
