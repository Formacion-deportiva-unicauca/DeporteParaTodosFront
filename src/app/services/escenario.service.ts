import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { EscenarioDTO } from '../Models/DTOs/escenario-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EscenarioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEscenarios(): Observable<EscenarioDTO[]> {
    return this.http.get<EscenarioDTO[]>(`${this.apiUrl}/escenarios`).pipe(
      catchError((error) => throwError(error))
    );
  }
}
