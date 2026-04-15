import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { ProfileStateFacade } from '../services/profile-state.facade';

async function getTargetRoute(
  profileStateFacade: ProfileStateFacade
): Promise<'/dashboard' | '/onboarding'> {
  const token = await profileStateFacade.getAccessToken();
  if (!token) {
    profileStateFacade.clearProfileLoadStateCache();
    return '/onboarding';
  }

  const profileCompleteHint = await profileStateFacade.getStoredProfileCompleteHint();
  if (profileCompleteHint) {
    // Resolve route immediately for returning users; revalidate in background.
    void profileStateFacade.getProfileLoadState(true);
    return '/dashboard';
  }

  const profileState = await profileStateFacade.getProfileLoadState(true);
  return profileState.status === 'complete' ? '/dashboard' : '/onboarding';
}

function toUrlTree(router: Router, route: '/dashboard' | '/onboarding'): UrlTree {
  return router.createUrlTree([route]);
}

export const dashboardRouteGuard: CanMatchFn = async () => {
  const profileStateFacade = inject(ProfileStateFacade);
  const router = inject(Router);
  const targetRoute = await getTargetRoute(profileStateFacade);
  return targetRoute === '/dashboard' ? true : toUrlTree(router, '/onboarding');
};

export const onboardingRouteGuard: CanMatchFn = async () => {
  const profileStateFacade = inject(ProfileStateFacade);
  const router = inject(Router);
  const targetRoute = await getTargetRoute(profileStateFacade);
  return targetRoute === '/onboarding' ? true : toUrlTree(router, '/dashboard');
};
