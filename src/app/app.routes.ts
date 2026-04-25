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
    path: 'leads',
    loadComponent: () => import('./components/leads/leads.page').then((m) => m.LeadsPageComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./components/settings/settings.page').then((m) => m.SettingsPageComponent)
  },
  {
    path: 'pitch/:slug',
    loadComponent: () => import('./components/pitch/pitch.page').then((m) => m.PitchPageComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./components/not-found.page').then((m) => m.NotFoundPageComponent)
  }
];
