import { Injectable } from '@angular/core';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthSessionService {
  private readonly appSessionStorageKeys = ['crm.profile.completeByUser', 'crm.magiclink.nextAllowedAt'];

  constructor(private readonly supabaseService: SupabaseService) {}

  async getSession(): Promise<Session | null> {
    const { data, error } = await this.supabaseService.client.auth.getSession();
    if (error) {
      return null;
    }
    return data.session ?? null;
  }

  async getAccessToken(): Promise<string> {
    const session = await this.getSession();
    return session?.access_token ?? '';
  }

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): { unsubscribe: () => void } {
    const listener = this.supabaseService.client.auth.onAuthStateChange(callback);
    return listener.data.subscription;
  }

  async signOut(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
    this.clearAppSessionStorage();
  }

  async signInWithGoogleOAuth(redirectTo: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabaseService.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });
    return { error };
  }

  async sendMagicLink(email: string, emailRedirectTo: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabaseService.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo
      }
    });
    return { error };
  }

  private clearAppSessionStorage(): void {
    for (const key of this.appSessionStorageKeys) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore storage errors in restricted environments.
      }
    }
  }
}
