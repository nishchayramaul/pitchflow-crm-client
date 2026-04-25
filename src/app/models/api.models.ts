export interface SlugAvailabilityResponse {
  is_available: boolean;
}

export interface UpdateProfilePayload {
  display_name: string;
  slug: string;
  avatar_url: string | null;
}

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'radio' | 'checkbox' | 'file';

export interface FormField {
  id: string; // Unique ID (e.g., generated via uuid)
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // Only used for select/radio/checkbox
  allowedExtensions?: string[]; // Only used for file uploads
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
