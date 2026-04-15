import { Injectable } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { SlugAvailabilityResponse } from '../models/api.models';
import { AuthSessionService } from './auth-session.service';
import { OnboardingApiService } from './onboarding-api.service';

export type OnboardingStep = 'signin' | 'claim';
export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';

export interface SessionViewState {
  step: OnboardingStep;
  authLoading: boolean;
  authError: string;
}

export interface SlugValidationState {
  status: SlugStatus;
  helpText: string;
  error: string;
  shouldCheckAvailability: boolean;
}

export interface ProfileLoadState {
  status: 'complete' | 'incomplete' | 'error';
  displayName: string;
  profileUrl: string;
  error: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileStateFacade {
  private readonly slugPattern = /^[a-z0-9-]{3,32}$/;
  private readonly profileCompleteStorageKey = 'crm.profile.completeByUser';
  private cachedProfileLoadState: ProfileLoadState | null = null;

  constructor(
    private readonly authSessionService: AuthSessionService,
    private readonly onboardingApi: OnboardingApiService
  ) {}

  async getAccessToken(): Promise<string> {
    return this.authSessionService.getAccessToken();
  }

  async getSession(): Promise<Session | null> {
    return this.authSessionService.getSession();
  }

  onAuthStateChange(
    callback: Parameters<AuthSessionService['onAuthStateChange']>[0]
  ): ReturnType<AuthSessionService['onAuthStateChange']> {
    return this.authSessionService.onAuthStateChange(callback);
  }

  getSessionViewState(accessToken: string): SessionViewState {
    return {
      step: accessToken ? 'claim' : 'signin',
      authLoading: false,
      authError: ''
    };
  }

  getSlugInputState(slug: string): SlugValidationState {
    if (!slug) {
      return this.slugState('idle', 'Use 3-32 lowercase letters, numbers, or hyphens.');
    }

    if (!this.slugPattern.test(slug)) {
      return this.slugState('idle', 'Slug format is invalid.');
    }

    return this.slugState('checking', 'Checking availability...', '', true);
  }

  getSlugResultState(result: SlugAvailabilityResponse | null, hasError: boolean): SlugValidationState {
    if (hasError || !result) {
      return this.slugState('idle', 'Could not validate slug right now.', 'Network issue while checking slug.');
    }

    if (result.is_available) {
      return this.slugState('available', 'Slug available.');
    }

    return this.slugState('taken', 'That slug is already taken.');
  }

  clearProfileLoadStateCache(): void {
    this.cachedProfileLoadState = null;
    this.clearStoredProfileCompleteMap();
  }

  async markProfileComplete(displayName: string, slug: string): Promise<void> {
    this.cachedProfileLoadState = {
      status: 'complete',
      displayName,
      profileUrl: this.buildProfileUrl(slug),
      error: ''
    };
    const session = await this.authSessionService.getSession();
    const userId = session?.user?.id ?? null;
    if (userId) {
      this.setStoredProfileCompleteForUser(userId, true);
    }
  }

  async getStoredProfileCompleteHint(): Promise<boolean> {
    const session = await this.authSessionService.getSession();
    const userId = session?.user?.id ?? null;
    if (!userId) {
      return false;
    }
    return this.getStoredProfileCompleteForUser(userId);
  }

  async getProfileLoadState(forceRefresh = false): Promise<ProfileLoadState> {
    if (!forceRefresh && this.cachedProfileLoadState) {
      return this.cachedProfileLoadState;
    }

    try {
      const profile = await firstValueFrom(this.onboardingApi.getMe());
      if (!profile.display_name || !profile.slug) {
        this.cachedProfileLoadState = {
          status: 'incomplete',
          displayName: '',
          profileUrl: '',
          error: ''
        };
        const session = await this.authSessionService.getSession();
        const userId = session?.user?.id ?? null;
        if (userId) {
          this.setStoredProfileCompleteForUser(userId, false);
        }
        return this.cachedProfileLoadState;
      }

      this.cachedProfileLoadState = {
        status: 'complete',
        displayName: profile.display_name,
        profileUrl: this.buildProfileUrl(profile.slug),
        error: ''
      };
      const session = await this.authSessionService.getSession();
      const userId = session?.user?.id ?? null;
      if (userId) {
        this.setStoredProfileCompleteForUser(userId, true);
      }
      return this.cachedProfileLoadState;
    } catch (error: any) {
      this.cachedProfileLoadState = {
        status: 'error',
        displayName: '',
        profileUrl: '',
        error: error?.error?.detail ?? 'Unable to load profile.'
      };
      return this.cachedProfileLoadState;
    }
  }

  private buildProfileUrl(slug: string): string {
    return `pitchflow.in/${slug}`;
  }

  private getStoredProfileCompleteForUser(userId: string): boolean {
    try {
      const map = this.readStoredProfileCompleteMap();
      return map[userId] === true;
    } catch {
      return false;
    }
  }

  private setStoredProfileCompleteForUser(userId: string, value: boolean): void {
    try {
      const map = this.readStoredProfileCompleteMap();
      if (value) {
        map[userId] = true;
      } else {
        delete map[userId];
      }
      localStorage.setItem(this.profileCompleteStorageKey, JSON.stringify(map));
    } catch {
      // Ignore storage failures in private mode or restricted environments.
    }
  }

  private clearStoredProfileCompleteMap(): void {
    try {
      localStorage.removeItem(this.profileCompleteStorageKey);
    } catch {
      // Ignore storage failures in private mode or restricted environments.
    }
  }

  private readStoredProfileCompleteMap(): Record<string, boolean> {
    const rawValue = localStorage.getItem(this.profileCompleteStorageKey);
    if (!rawValue) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      return parsed as Record<string, boolean>;
    } catch {
      return {};
    }
  }

  private slugState(
    status: SlugStatus,
    helpText: string,
    error = '',
    shouldCheckAvailability = false
  ): SlugValidationState {
    return {
      status,
      helpText,
      error,
      shouldCheckAvailability
    };
  }
}
