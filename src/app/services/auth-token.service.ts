import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthTokenService {
  private readonly authTokenKey = 'pitchflow_access_token';

  save(token: string): void {
    localStorage.setItem(this.authTokenKey, token);
  }

  get(): string {
    return localStorage.getItem(this.authTokenKey) ?? '';
  }

  clear(): void {
    localStorage.removeItem(this.authTokenKey);
  }
}
