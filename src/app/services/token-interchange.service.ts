import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY, Observable, Subject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { PerfilDTO } from '../Models/DTOs/perfil-tdo';
import { PerfilService } from './perfil.service';

interface TokenResponse {
  token: string;
  perfil: PerfilDTO;
}

@Injectable({
  providedIn: 'root'
})
export class TokenInterchangeService {
  private readonly apiUrl = 'http://127.0.0.1:8082/api/v2';

  private readonly tokenSavedSource = new Subject<void>();
  readonly tokenReady$ = this.tokenSavedSource.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private perfilService: PerfilService,
  ) {}

  exchangeGoogleToken(idToken: string): Observable<void> {
    const headers = new HttpHeaders().set('Authorization', `Bearer ${idToken}`);
    return this.http.post<TokenResponse>(`${this.apiUrl}/auth/token`, {}, { headers }).pipe(
      tap(resp => {
        sessionStorage.setItem('dpt_token', resp.token);
        sessionStorage.setItem('dpt_role', resp.perfil.role);
        sessionStorage.setItem('dpt_perfil_id', String(resp.perfil.id));
        sessionStorage.setItem('dpt_perfil', JSON.stringify(resp.perfil));
        this.perfilService.setPerfil(resp.perfil.role);
        this.tokenSavedSource.next();
      }),
      map(() => void 0),
      catchError(err => {
        if (err.status === 404) {
          // Usuario autenticado con Google pero sin rol registrado en el sistema.
          // SCRUM-159: redirige a CompletarPerfilComponent donde elige rol
          // y completa sus datos identificativos.
          void this.router.navigate(['/completar-perfil']);
          return EMPTY;
        }
        return throwError(() => err);
      })
    );
  }
}
