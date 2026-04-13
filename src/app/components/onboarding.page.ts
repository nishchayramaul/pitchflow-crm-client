import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, filter, firstValueFrom, switchMap, takeUntil, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthTokenService } from '../services/auth-token.service';
import { OnboardingApiService } from '../services/onboarding-api.service';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-onboarding-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.scss'
})
export class OnboardingPageComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly slugPattern = /^[a-z0-9-]{3,32}$/;

  currentStep: 'signin' | 'claim' = 'signin';
  authLoading = false;
  authError = '';
  magicLinkLoading = false;
  magicLinkMessage = '';

  slugStatus: 'idle' | 'checking' | 'available' | 'taken' = 'idle';
  slugHelpText = 'Use 3-32 lowercase letters, numbers, or hyphens.';
  slugError = '';

  isFinalizing = false;
  claimError = '';

  readonly emailForm;
  readonly claimForm;

  constructor(
    private readonly fb: FormBuilder,
    private readonly onboardingApi: OnboardingApiService,
    private readonly authTokenService: AuthTokenService,
    private readonly supabaseService: SupabaseService,
    private readonly router: Router
  ) {
    this.emailForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]]
    });
    this.claimForm = this.fb.nonNullable.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      slug: ['', [Validators.required, Validators.pattern(this.slugPattern)]]
    });
    this.currentStep = this.authTokenService.get() ? 'claim' : 'signin';
    this.initializeSlugWatcher();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async signInWithGoogle(): Promise<void> {
    this.authError = '';
    this.magicLinkMessage = '';
    this.authLoading = true;

    try {
      const { error } = await this.supabaseService.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: globalThis.location.origin
        }
      });
      if (error) {
        throw error;
      }
    } catch (error: any) {
      this.authError = error?.message ?? 'Unable to start Google sign-in.';
      this.authLoading = false;
    }
  }

  async sendMagicLink(): Promise<void> {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.authError = '';
    this.magicLinkMessage = '';
    this.magicLinkLoading = true;

    try {
      const email = this.emailForm.controls.email.getRawValue();
      const { error } = await this.supabaseService.client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: environment.authRedirectUrl
        }
      });
      if (error) {
        throw error;
      }

      this.magicLinkMessage =
        'Magic link sent. Check your inbox and click the link to continue.';
    } catch (error: any) {
      this.authError = error?.message ?? 'Unable to send magic link right now.';
    } finally {
      this.magicLinkLoading = false;
    }
  }

  async signOut(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
    this.authTokenService.clear();
    this.currentStep = 'signin';
    this.authLoading = false;
    this.magicLinkLoading = false;
    this.magicLinkMessage = '';
    this.claimError = '';
    this.authError = '';
  }

  async finalizeProfile(): Promise<void> {
    if (this.claimForm.invalid || this.slugStatus !== 'available') {
      this.claimForm.markAllAsTouched();
      return;
    }

    this.claimError = '';
    this.isFinalizing = true;

    const token = this.authTokenService.get();
    if (!token) {
      this.claimError = 'Session missing. Please sign in again.';
      this.isFinalizing = false;
      this.currentStep = 'signin';
      return;
    }

    try {
      const { displayName, slug } = this.claimForm.getRawValue();
      await firstValueFrom(
        this.onboardingApi.updateProfile({
          display_name: displayName,
          slug,
          avatar_url: null
        })
      );
      await this.router.navigateByUrl('/dashboard');
    } catch (error: any) {
      this.claimError = error?.error?.detail ?? 'Unable to save profile right now.';
    } finally {
      this.isFinalizing = false;
    }
  }

  private initializeSlugWatcher(): void {
    this.claimForm.controls.slug.valueChanges
      .pipe(
        tap(() => {
          this.slugError = '';
          this.slugStatus = 'idle';
        }),
        filter((slug): slug is string => !!slug && slug.length > 0),
        filter((slug) => {
          if (!this.slugPattern.test(slug)) {
            this.slugHelpText = 'Slug format is invalid.';
            return false;
          }
          this.slugHelpText = 'Checking availability...';
          return true;
        }),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.slugStatus = 'checking';
        }),
        switchMap((slug) => this.onboardingApi.checkSlug(slug)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          this.slugStatus = result.is_available ? 'available' : 'taken';
          this.slugHelpText = result.is_available
            ? 'Slug available.'
            : 'That slug is already taken.';
        },
        error: () => {
          this.slugStatus = 'idle';
          this.slugHelpText = 'Could not validate slug right now.';
          this.slugError = 'Network issue while checking slug.';
        }
      });
  }
}
