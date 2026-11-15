import { Injectable, Injector } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { SesionVencidaService } from '../shared/sesion-vencida.service';

const BACKEND_API = environment.apiUrl;
// El intercambio de token tiene su propio manejo de errores (ver AuthService y TokenInterchangeService).
const RUTA_INTERCAMBIO = `${BACKEND_API}/auth/token`;

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // SesionVencidaService depende de servicios que usan HttpClient: se pide al usarlo para no crear un ciclo al construir.
  constructor(private injector: Injector) {}

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
    })).pipe(
      catchError((error: unknown) => {
        // Solo el 401 es sesión vencida: el 403 es falta de permisos y debe seguir siendo un error normal.
        if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.startsWith(RUTA_INTERCAMBIO)) {
          this.injector.get(SesionVencidaService).alRecibir401(token);
        }
        return throwError(() => error);
      }),
    );
  }
}
