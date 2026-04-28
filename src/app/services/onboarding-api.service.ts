import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SKIP_AUTH } from '../interceptors/auth.interceptor';
import {
  FormField,
  Lead,
  LeadsResponse,
  PublicPitchFormResponse,
  SlugAvailabilityResponse,
  SubmitPitchPayload,
  UpdateLeadStatusPayload,
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

  updateMinimumBudget(minimumBudget: number): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiBaseUrl}/api/users/minimum-budget`,
      { minimum_budget: minimumBudget }
    );
  }

  updateCurrency(currency: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiBaseUrl}/api/users/currency`,
      { currency }
    );
  }

  submitPitch(payload: SubmitPitchPayload): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${environment.apiBaseUrl}/api/leads`,
      payload,
      { context: new HttpContext().set(SKIP_AUTH, true) }
    );
  }

  getLeads(params?: {
    page?: number;
    page_size?: number;
    status?: string;
    search?: string;
  }): Observable<LeadsResponse> {
    let query = '';
    if (params) {
      const p = new URLSearchParams();
      if (params.page)      p.set('page',      String(params.page));
      if (params.page_size) p.set('page_size', String(params.page_size));
      if (params.status)    p.set('status',    params.status);
      if (params.search)    p.set('search',    params.search);
      const qs = p.toString();
      if (qs) query = `?${qs}`;
    }
    return this.http.get<LeadsResponse>(`${environment.apiBaseUrl}/api/leads${query}`);
  }

  updateLeadStatus(leadId: string, payload: UpdateLeadStatusPayload): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(
      `${environment.apiBaseUrl}/api/leads/${encodeURIComponent(leadId)}/status`,
      payload
    );
  }
}
