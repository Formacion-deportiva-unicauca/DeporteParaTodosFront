import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BACKEND_API = environment.apiUrl;

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!req.url.startsWith(BACKEND_API)) {
      return next.handle(req);
    }
    const token = sessionStorage.getItem('dpt_token');
    if (!token) {
      return next.handle(req);
    }
    return next.handle(req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }));
  }
}
