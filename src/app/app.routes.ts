import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'onboarding'
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./components/onboarding.page').then((m) => m.OnboardingPageComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard.page').then((m) => m.DashboardPageComponent)
  },
  {
    path: '**',
    redirectTo: 'onboarding'
  }
];
