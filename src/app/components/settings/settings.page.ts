import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { FormField } from '../../models/api.models';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { ToastService } from '../../services/toast.service';
import { SidenavComponent } from '../sidenav/sidenav.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DragDropModule, SidenavComponent],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss'
})
export class SettingsPageComponent implements OnInit {
  formSchema: FormField[] = [];
  tier: 'free' | 'pro' = 'free';

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

  private readonly optionTypes = ['select', 'radio', 'checkbox'];

  constructor(
    private api: OnboardingApiService,
    private fb: FormBuilder,
    private toast: ToastService
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
      this.formSchema = profile.form_schema ?? [];
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
}
