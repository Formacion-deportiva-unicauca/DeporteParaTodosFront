import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { DeporteDTO } from '../Models/DTOs/deporte-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DeporteService {

  private url = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getDeportes(): Observable<DeporteDTO[]> {
    return this.http.get<DeporteDTO[]>(`${this.url}/deportes`).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  crearDeporte(deporte: DeporteDTO): Observable<DeporteDTO> {
    return this.http.post<DeporteDTO>(`${this.url}/deportes`, deporte).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }
}
