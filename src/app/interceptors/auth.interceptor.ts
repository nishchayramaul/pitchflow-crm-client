import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthTokenService } from '../services/auth-token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(AuthTokenService);
  const token = tokenService.get();
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);

  if (!token || !isApiRequest) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
