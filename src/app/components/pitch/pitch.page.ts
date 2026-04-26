import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FormField } from '../../models/api.models';
import { OnboardingApiService } from '../../services/onboarding-api.service';

@Component({
  selector: 'app-pitch-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './pitch.page.html',
  styleUrl: './pitch.page.scss'
})
export class PitchPageComponent implements OnInit {
  pitchForm!: FormGroup;
  formSchema: FormField[] = [];
  creatorName = '';
  creatorSlug = '';
  loading = true;
  error = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private api: OnboardingApiService,
    public router: Router
  ) {}

  ngOnInit() {
    this.creatorSlug = this.route.snapshot.paramMap.get('slug') || '';

    if (!this.creatorSlug) {
      this.error = 'Invalid creator link';
      this.loading = false;
      return;
    }

    this.loadCreatorForm();
  }

  private async loadCreatorForm() {
    try {
      const data = await firstValueFrom(this.api.getPitchForm(this.creatorSlug));
      this.creatorName = data.display_name;
      this.formSchema = data.form_schema;
      this.buildForm();
    } catch (err: any) {
      this.error = err?.error?.detail ?? 'Creator not found or form unavailable';
    } finally {
      this.loading = false;
    }
  }

  buildForm() {
    const group: Record<string, any> = {};

    this.formSchema.forEach(field => {
      const req = field.required;

      switch (field.type) {
        case 'checkbox': {
          const isMulti = field.multiselect !== false;
          // Multi: store string[]. Single: store string ''.
          // Validators.required on [] fails (length === 0), on '' fails — both correct.
          group[field.id] = [isMulti ? [] : '', req ? [Validators.required] : []];
          break;
        }
        case 'email': {
          const validators = req
            ? [Validators.required, Validators.email]
            : [Validators.email];
          group[field.id] = ['', validators];
          break;
        }
        default:
          group[field.id] = ['', req ? [Validators.required] : []];
      }
    });

    this.pitchForm = this.fb.group(group);
  }

  // Multi-select checkbox: toggle option in/out of string[]
  onCheckboxChange(fieldId: string, option: string, checked: boolean) {
    const current: string[] = this.pitchForm.get(fieldId)?.value ?? [];
    const next = checked
      ? [...current, option]
      : current.filter(v => v !== option);
    this.pitchForm.get(fieldId)?.setValue(next);
    this.pitchForm.get(fieldId)?.markAsTouched();
  }

  // Single-select checkbox: store one value or clear
  onSingleCheckboxChange(fieldId: string, option: string, checked: boolean) {
    this.pitchForm.get(fieldId)?.setValue(checked ? option : '');
    this.pitchForm.get(fieldId)?.markAsTouched();
  }

  onFileSelected(event: Event, fieldId: string) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.pitchForm.get(fieldId)?.setValue(input.files[0]);
    }
  }

  submitPitch() {
    if (this.pitchForm.invalid) {
      this.pitchForm.markAllAsTouched();
      return;
    }
    // TODO: POST to /api/leads once leads endpoint is built
    console.log('Pitch payload:', this.pitchForm.value);
    alert('Pitch sent successfully!');
    this.pitchForm.reset();
  }
}
