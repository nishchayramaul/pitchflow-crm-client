import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { FormField } from '../../models/api.models';
import { OnboardingApiService } from '../../services/onboarding-api.service';
import { SidenavComponent } from '../sidenav/sidenav.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule, SidenavComponent],
  templateUrl: './settings.page.html',
  styleUrl: './settings.page.scss'
})
export class SettingsPageComponent implements OnInit {
  formSchema: FormField[] = [];
  tier: 'free' | 'pro' = 'free';

  newFieldForm: FormGroup;
  fieldTypes = ['text', 'textarea', 'number', 'select', 'radio', 'checkbox', 'file'];

  loadError = '';
  saveLoading = false;
  saveSuccess = false;
  saveError = '';

  constructor(
    private api: OnboardingApiService,
    private fb: FormBuilder
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
      this.loadError = err?.error?.detail ?? 'Could not load form configuration.';
    }
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

    if (['select', 'radio', 'checkbox'].includes(val.type)) {
      newField.options = ['Option 1', 'Option 2'];
    }

    this.formSchema = [...this.formSchema, newField];
    this.newFieldForm.reset({ type: 'text', required: false });
  }

  deleteField(index: number) {
    this.formSchema = this.formSchema.filter((_, i) => i !== index);
  }

  drop(event: CdkDragDrop<FormField[]>) {
    const updated = [...this.formSchema];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    this.formSchema = updated;
  }

  async saveSchema() {
    this.saveLoading = true;
    this.saveSuccess = false;
    this.saveError = '';

    try {
      await firstValueFrom(this.api.updateFormSchema(this.formSchema));
      this.saveSuccess = true;
      setTimeout(() => (this.saveSuccess = false), 3000);
    } catch (err: any) {
      this.saveError = err?.error?.detail ?? 'Failed to save. Please try again.';
    } finally {
      this.saveLoading = false;
    }
  }

  upgradeToPro() {
    this.tier = 'pro';
  }
}
