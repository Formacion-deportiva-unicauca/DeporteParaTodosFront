import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { NovedadClaseDto, NovedadClaseRequestDto } from '../Models/DTOs/novedad-clase-dto';

@Injectable({
  providedIn: 'root'
})
export class NovedadClaseService {
  private apiUrl = 'http://127.0.0.1:8082/api/v2';

  constructor(private http: HttpClient) { }

  registrarNovedad(datos: NovedadClaseRequestDto): Observable<NovedadClaseDto> {
    return this.http.post<NovedadClaseDto>(`${this.apiUrl}/novedades-clase`, datos).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  obtenerNovedadesGrupo(categoria: string, curso: string, anio: number, iterable: number): Observable<NovedadClaseDto[]> {
    return this.http.get<NovedadClaseDto[]>(
      `${this.apiUrl}/novedades-clase?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`
    ).pipe(
      catchError((error) => throwError(() => error))
    );
  }

  actualizarNovedad(codigo: number, datos: NovedadClaseRequestDto): Observable<NovedadClaseDto> {
    return this.http.put<NovedadClaseDto>(`${this.apiUrl}/novedades-clase/${codigo}`, datos).pipe(
      catchError((error) => throwError(() => error))
    );
  }
}
