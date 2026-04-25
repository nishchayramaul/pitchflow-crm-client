import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_AUTH } from '../interceptors/auth.interceptor';
import {
  FormField,
  PublicPitchFormResponse,
  SlugAvailabilityResponse,
  UpdateProfilePayload,
  UserProfileResponse,
} from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class OnboardingApiService {
  constructor(private readonly http: HttpClient) {}

  checkSlug(slug: string): Observable<SlugAvailabilityResponse> {
    return this.http.get<SlugAvailabilityResponse>(
      `${environment.apiBaseUrl}/api/users/check-slug/${encodeURIComponent(slug)}`
    );
  }

  getMe(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${environment.apiBaseUrl}/api/users/me`);
  }

  updateProfile(payload: UpdateProfilePayload): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${environment.apiBaseUrl}/api/users/profile`, payload);
  }

  getPitchForm(slug: string): Observable<PublicPitchFormResponse> {
    return this.http.get<PublicPitchFormResponse>(
      `${environment.apiBaseUrl}/api/pitch/${encodeURIComponent(slug)}`
    );
  }

  updateFormSchema(formSchema: FormField[]): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiBaseUrl}/api/users/form-schema`,
      { form_schema: formSchema }
    );
  }
}
