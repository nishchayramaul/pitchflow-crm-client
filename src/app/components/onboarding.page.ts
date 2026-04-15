import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  of,
  switchMap,
  takeUntil,
  tap
} from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthSessionService } from '../services/auth-session.service';
import { LoaderService } from '../services/loader.service';
import { OnboardingApiService } from '../services/onboarding-api.service';
import { ProfileStateFacade, SlugValidationState } from '../services/profile-state.facade';

@Component({
  selector: 'app-onboarding-page',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.scss'
})
export class OnboardingPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly slugPattern = /^[a-z0-9-]{3,32}$/;
  private readonly magicLinkCooldownMs = 60_000;
  private readonly magicLinkCooldownStorageKey = 'crm.magiclink.nextAllowedAt';
  private authStateSubscription?: { unsubscribe: () => void };
  private magicLinkCooldownTimerId: number | null = null;

  currentStep: 'signin' | 'claim' = 'signin';
  authLoading = false;
  authError = '';
  magicLinkLoading = false;
  magicLinkMessage = '';
  magicLinkCooldownSeconds = 0;

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
    private readonly authSessionService: AuthSessionService,
    private readonly router: Router,
    private readonly profileStateFacade: ProfileStateFacade,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly loaderService: LoaderService
  ) {
    this.emailForm = this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]]
    });
    this.claimForm = this.fb.nonNullable.group({
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      slug: ['', [Validators.required, Validators.pattern(this.slugPattern)]]
    });
    this.initializeSlugWatcher();
  }

  ngOnInit(): void {
    this.restoreMagicLinkCooldown();
    void this.bootstrapSessionState();
    const authStateChange = this.profileStateFacade.onAuthStateChange((_event, session) => {
      void this.ngZone.run(() => this.syncSessionState(session?.access_token ?? ''));
    });
    this.authStateSubscription = authStateChange;
  }

  ngOnDestroy(): void {
    this.authStateSubscription?.unsubscribe();
    this.stopMagicLinkCooldownTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  async signInWithGoogle(): Promise<void> {
    this.authError = '';
    this.magicLinkMessage = '';
    this.authLoading = true;

    try {
      const { error } = await this.loaderService.trackPromise(
        this.authSessionService.signInWithGoogleOAuth(globalThis.location.origin),
        'Redirecting to Google...'
      );
      if (error) {
        throw error;
      }
    } catch (error: any) {
      this.authError = error?.message ?? 'Unable to start Google sign-in.';
      this.authLoading = false;
    }
  }

  async sendMagicLink(): Promise<void> {
    if (this.magicLinkCooldownSeconds > 0) {
      this.authError = `Please wait ${this.magicLinkCooldownSeconds}s before requesting another link.`;
      return;
    }

    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.authError = '';
    this.magicLinkMessage = '';
    this.magicLinkLoading = true;

    try {
      const email = this.emailForm.controls.email.getRawValue();
      const { error } = await this.authSessionService.sendMagicLink(
        email,
        environment.authRedirectUrl
      );
      if (error) {
        throw error;
      }

      this.magicLinkMessage =
        'Magic link sent. Check your inbox and click the link to continue.';
      this.startMagicLinkCooldown(Date.now() + this.magicLinkCooldownMs);
    } catch (error: any) {
      if (this.isMagicLinkRateLimitError(error)) {
        this.startMagicLinkCooldown(Date.now() + this.magicLinkCooldownMs);
        this.authError = `Too many requests. Please wait ${this.magicLinkCooldownSeconds}s and try again.`;
      } else {
        this.authError = error?.message ?? 'Unable to send magic link right now.';
      }
    } finally {
      this.magicLinkLoading = false;
    }
  }

  async signOut(): Promise<void> {
    await this.authSessionService.signOut();
    this.profileStateFacade.clearProfileLoadStateCache();
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

    const token = await this.getFreshAccessToken();
    if (!token) {
      this.claimError = 'Session missing. Please sign in again.';
      this.isFinalizing = false;
      this.currentStep = 'signin';
      return;
    }

    try {
      const { displayName, slug } = this.claimForm.getRawValue();
      await firstValueFrom(
        this.loaderService.trackObservable(
          this.onboardingApi.updateProfile({
            display_name: displayName,
            slug,
            avatar_url: null
          }),
          'Saving profile...'
        )
      );
      await this.profileStateFacade.markProfileComplete(displayName, slug);
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
        map((slug) => slug ?? ''),
        map((slug) => ({
          slug,
          inputState: this.profileStateFacade.getSlugInputState(slug)
        })),
        tap(({ inputState }) => this.applySlugState(inputState)),
        filter(({ slug, inputState }) => slug.length > 0 && inputState.shouldCheckAvailability),
        map(({ slug }) => slug),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((slug) =>
          this.onboardingApi.checkSlug(slug).pipe(
            map((result) => ({ result, hasError: false })),
            catchError(() => of({ result: null, hasError: true }))
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ result, hasError }) => {
          this.ngZone.run(() =>
            this.applySlugState(this.profileStateFacade.getSlugResultState(result, hasError))
          );
        }
      });
  }

  private async bootstrapSessionState(): Promise<void> {
    const token = await this.profileStateFacade.getAccessToken();
    await this.ngZone.run(() => this.syncSessionState(token));
  }

  private async syncSessionState(token: string): Promise<void> {
    const viewState = this.profileStateFacade.getSessionViewState(token);
    this.authLoading = viewState.authLoading;
    this.authError = viewState.authError;

    if (!token) {
      this.currentStep = 'signin';
      this.cdr.detectChanges();
      return;
    }

    // Move to claim immediately once session exists; profile load can then decide dashboard redirect.
    this.currentStep = 'claim';
    this.cdr.detectChanges();

    const profileState = await this.profileStateFacade.getProfileLoadState(true);
    if (profileState.status === 'complete') {
      await this.router.navigateByUrl('/dashboard');
      return;
    }

    this.currentStep = 'claim';
    this.cdr.detectChanges();
  }

  private async getFreshAccessToken(): Promise<string> {
    return this.profileStateFacade.getAccessToken();
  }

  private applySlugState(state: {
    status: SlugValidationState['status'];
    helpText: SlugValidationState['helpText'];
    error: SlugValidationState['error'];
  }): void {
    this.slugStatus = state.status;
    this.slugHelpText = state.helpText;
    this.slugError = state.error;
    this.cdr.detectChanges();
  }

  private isMagicLinkRateLimitError(error: unknown): boolean {
    const status = (error as { status?: number } | null)?.status;
    if (status === 429) {
      return true;
    }

    const message = (error as { message?: string } | null)?.message ?? '';
    return /too many requests|rate limit|security purposes/i.test(message);
  }

  private restoreMagicLinkCooldown(): void {
    let nextAllowedAt = 0;
    try {
      const rawValue = localStorage.getItem(this.magicLinkCooldownStorageKey);
      nextAllowedAt = rawValue ? Number.parseInt(rawValue, 10) : 0;
    } catch {
      nextAllowedAt = 0;
    }

    if (!Number.isFinite(nextAllowedAt) || nextAllowedAt <= Date.now()) {
      this.clearMagicLinkCooldownStorage();
      return;
    }

    this.startMagicLinkCooldown(nextAllowedAt);
  }

  private startMagicLinkCooldown(nextAllowedAt: number): void {
    this.stopMagicLinkCooldownTimer();
    this.updateMagicLinkCooldown(nextAllowedAt);
    try {
      localStorage.setItem(this.magicLinkCooldownStorageKey, String(nextAllowedAt));
    } catch {
      // Ignore storage write failures.
    }

    this.magicLinkCooldownTimerId = globalThis.setInterval(() => {
      this.updateMagicLinkCooldown(nextAllowedAt);
    }, 1000);
  }

  private updateMagicLinkCooldown(nextAllowedAt: number): void {
    const remainingMs = nextAllowedAt - Date.now();
    if (remainingMs <= 0) {
      this.magicLinkCooldownSeconds = 0;
      this.clearMagicLinkCooldownStorage();
      this.stopMagicLinkCooldownTimer();
      this.cdr.detectChanges();
      return;
    }

    this.magicLinkCooldownSeconds = Math.ceil(remainingMs / 1000);
    this.cdr.detectChanges();
  }

  private stopMagicLinkCooldownTimer(): void {
    if (this.magicLinkCooldownTimerId === null) {
      return;
    }
    globalThis.clearInterval(this.magicLinkCooldownTimerId);
    this.magicLinkCooldownTimerId = null;
  }

  private clearMagicLinkCooldownStorage(): void {
    try {
      localStorage.removeItem(this.magicLinkCooldownStorageKey);
    } catch {
      // Ignore storage remove failures.
    }
  }

}
