export interface SlugAvailabilityResponse {
  is_available: boolean;
}

export interface UpdateProfilePayload {
  display_name: string;
  slug: string;
  avatar_url: string | null;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  display_name: string | null;
  slug: string | null;
  avatar_url: string | null;
}
