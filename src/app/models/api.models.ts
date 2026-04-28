export interface SlugAvailabilityResponse {
  is_available: boolean;
}

export interface UpdateProfilePayload {
  display_name: string;
  slug: string;
  avatar_url: string | null;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'file' | 'email';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];        // select / radio / checkbox
  multiselect?: boolean;     // checkbox only — undefined/true = multi, false = single
  locked?: boolean;          // brand_name / brand_email / budget — cannot delete or drag
  allowedExtensions?: string[];
}

export interface UserProfileResponse {
  id: string;
  email: string;
  display_name: string | null;
  slug: string | null;
  avatar_url: string | null;
  tier?: 'free' | 'pro';
  role?: 'creator' | 'team_member';
  form_schema?: FormField[];
  minimum_budget?: number | null;
  currency?: string | null;
}

export interface PublicPitchFormResponse {
  display_name: string;
  form_schema: FormField[];
}

export interface SubmitPitchPayload {
  slug: string;
  custom_responses: Record<string, any>;
}

export interface Lead {
  id: string;
  brand_name: string | null;
  brand_email: string | null;
  budget: number | null;
  custom_responses: Record<string, any>;
  status: string;
  created_at: string;
}

export interface LeadsResponse {
  items: Lead[];
  total: number;
  page: number;
  page_size: number;
  minimum_budget: number | null;
  currency: string | null;
}

export interface UpdateLeadStatusPayload {
  status: string;
}
