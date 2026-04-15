import { Routes } from '@angular/router';
import { dashboardRouteGuard, onboardingRouteGuard } from './guards/profile-route.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'onboarding',
    canMatch: [onboardingRouteGuard],
    loadComponent: () => import('./components/onboarding.page').then((m) => m.OnboardingPageComponent)
  },
  {
    path: 'dashboard',
    canMatch: [dashboardRouteGuard],
    loadComponent: () => import('./components/dashboard.page').then((m) => m.DashboardPageComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
