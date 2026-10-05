import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { InscripcionDTO } from '../Models/DTOs/inscripcion-dto';
import { DisponibilidadDTO } from '../Models/DTOs/disponibilidad-dto';
import { InscripcionEnEsperaDto } from '../Models/DTOs/inscripcion-en-espera-dto';
import { MiCursoDTO } from '../Models/DTOs/mis-cursos-dto';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class InscripcionesService {
  private apiUrl = 'http://127.0.0.1:8082/api/v2';
  constructor(private http: HttpClient) { }

  postInscripcion(data: InscripcionDTO): Observable<InscripcionDTO> {
    return this.http.post<InscripcionDTO>(`${this.apiUrl}/inscripcion`, data).pipe(
      catchError((error) => throwError(error))
    );
  }

  eliminarInscripcion(data: InscripcionDTO): Observable<InscripcionDTO> {
    return this.http.put<InscripcionDTO>(`${this.apiUrl}/desvincularInscripcion`, data).pipe(
      catchError((error) => throwError(error))
    );
  }

  getDisponibilidad(categoria: string, curso: string, anio: number, iterable: number): Observable<DisponibilidadDTO> {
    return this.http.get<DisponibilidadDTO>(
      `${this.apiUrl}/inscripcion/disponibilidad?prmCategoria=${encodeURIComponent(categoria)}&prmCurso=${encodeURIComponent(curso)}&prmAnio=${anio}&prmIterable=${iterable}`
    ).pipe(catchError((error) => throwError(error)));
  }

  validarInscripcion(alumnoId: string, categoria: string, curso: string, anio: number, iterable: number): Observable<boolean> {
    return this.http.get<boolean>(
      `${this.apiUrl}/validarInscripcion?alumnoId=${encodeURIComponent(alumnoId)}&categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`
    ).pipe(catchError((error) => throwError(error)));
  }

  getListaEspera(categoria: string, curso: string, anio: number, iterable: number): Observable<InscripcionEnEsperaDto[]> {
    return this.http.get<InscripcionEnEsperaDto[]>(
      `${this.apiUrl}/inscripcion/listaEspera?prmCategoria=${encodeURIComponent(categoria)}&prmCurso=${encodeURIComponent(curso)}&prmAnio=${anio}&prmIterable=${iterable}`
    ).pipe(catchError((error) => throwError(error)));
  }

  promoverAlumno(prmPerfId: string, categoria: string, curso: string, anio: number, iterable: number): Observable<InscripcionDTO> {
    return this.http.patch<InscripcionDTO>(
      `${this.apiUrl}/inscripcion/promover?prmPerfId=${encodeURIComponent(prmPerfId)}&prmCategoria=${encodeURIComponent(categoria)}&prmCurso=${encodeURIComponent(curso)}&prmAnio=${anio}&prmIterable=${iterable}`,
      {}
    ).pipe(catchError((error) => throwError(error)));
  }

  getMisCursos(): Observable<MiCursoDTO[]> {
    return this.http.get<MiCursoDTO[]>(`${this.apiUrl}/inscripcion/misCursos`).pipe(
      catchError((error) => throwError(error))
    );
  }
}






