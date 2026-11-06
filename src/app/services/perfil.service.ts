import { Injectable } from '@angular/core';
import { BehaviorSubject, tap, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { PerfilDTO } from '../Models/DTOs/perfil-tdo';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  apiUrl: string = environment.apiUrl;
  constructor(private http: HttpClient) { }

  private perfilSubject = new BehaviorSubject<string>('');
  perfil$ = this.perfilSubject.asObservable();

  setPerfil(perfil: string) {
    this.perfilSubject.next(perfil);
  }

  getPerfil() {
    return this.perfilSubject.value;
  }

  registrarPerfil(datos: PerfilDTO): Observable<PerfilDTO> {
    return this.http.post<PerfilDTO>(`${this.apiUrl}/RegistroPerfilAlumno`, datos).pipe(
    );
  }

  registrarInstructor(datos: PerfilDTO): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/RegistroPerfilInstructor`, datos);
  }
}
