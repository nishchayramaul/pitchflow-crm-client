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
}

export interface PublicPitchFormResponse {
  display_name: string;
  form_schema: FormField[];
}
