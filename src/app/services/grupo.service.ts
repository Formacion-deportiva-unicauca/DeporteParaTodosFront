import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { GrupoDTO } from '../Models/DTOs/grupo-dto';
import { MiGrupoInstructorDTO } from '../Models/DTOs/mis-cursos-dto';
import { OcupacionGrupoDTO, PeriodoInscripcionRequestDTO, PublicoCurso } from '../Models/DTOs/ocupacion-grupo-dto';

@Injectable({
  providedIn: 'root',
})
export class GrupoService {
  private apiUrl = 'http://127.0.0.1:8082/api/v2';

  constructor(private http: HttpClient) { }

  getGrupos(prmNombreCategoria: string, prmNombreCurso: string): Observable<GrupoDTO[]> {
    return this.http.get<GrupoDTO[]>(`${this.apiUrl}/gruposCurso?prmCategoria=${encodeURIComponent(prmNombreCategoria)}&prmCurso=${encodeURIComponent(prmNombreCurso)}`).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  createGrupo(grupo: GrupoDTO): Observable<GrupoDTO> {
    return this.http.post<GrupoDTO>(`${this.apiUrl}/grupo`, grupo).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  getGrupo(prmNombreCategoria: string, prmNombreCurso: string, anio: number, iterable: number): Observable<GrupoDTO> {
    return this.http.get<GrupoDTO>(
      `${this.apiUrl}/grupo?categoria=${encodeURIComponent(prmNombreCategoria)}&curso=${encodeURIComponent(prmNombreCurso)}&anio=${(anio)}&iterable=${(iterable)}`).pipe(
        catchError((error) => {
          return throwError(error);
        })
      );
  }

  /** Cierra (cerradas=true) o reabre (false) a mano las inscripciones de un grupo. Solo el Coordinador. */
  cambiarCierreInscripciones(categoria: string, curso: string, anio: number, iterable: number, cerradas: boolean): Observable<GrupoDTO> {
    return this.http.patch<GrupoDTO>(
      `${this.apiUrl}/grupo/inscripciones?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}&cerradas=${cerradas}`,
      null
    ).pipe(
      catchError((error) => throwError(error))
    );
  }

  /** Tablero de ocupación de los grupos (solo Coordinador). Los filtros son opcionales. */
  getOcupacion(filtros: { categoria?: string; curso?: string; publico?: PublicoCurso } = {}): Observable<OcupacionGrupoDTO[]> {
    const partes: string[] = [];
    if (filtros.categoria) partes.push(`categoria=${encodeURIComponent(filtros.categoria)}`);
    if (filtros.curso) partes.push(`curso=${encodeURIComponent(filtros.curso)}`);
    if (filtros.publico) partes.push(`publico=${filtros.publico}`);
    const query = partes.length ? `?${partes.join('&')}` : '';
    return this.http.get<OcupacionGrupoDTO[]>(`${this.apiUrl}/grupo/ocupacion${query}`).pipe(
      catchError((error) => throwError(error))
    );
  }

  /** Aplica un periodo de inscripciones a varios grupos, todo o nada (solo Coordinador). */
  aplicarPeriodo(body: PeriodoInscripcionRequestDTO): Observable<GrupoDTO[]> {
    return this.http.patch<GrupoDTO[]>(`${this.apiUrl}/grupo/periodo`, body).pipe(
      catchError((error) => throwError(error))
    );
  }

  updateGrupo(categoria: string, curso: string, anio: number, iterable: number, grupo: GrupoDTO): Observable<GrupoDTO> {
    return this.http.put<GrupoDTO>(
      `${this.apiUrl}/grupo?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`,
      grupo
    ).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  deleteGrupo(categoria: string, curso: string, anio: number, iterable: number): Observable<GrupoDTO> {
    return this.http.delete<GrupoDTO>(
      `${this.apiUrl}/grupo?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`
    ).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  /** Solo Coordinador. 404 = instructor inexistente o eliminado. */
  getGruposDeInstructor(idInstructor: string): Observable<MiGrupoInstructorDTO[]> {
    return this.http.get<MiGrupoInstructorDTO[]>(
      `${this.apiUrl}/grupo/instructor?idInstructor=${encodeURIComponent(idInstructor)}`
    ).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }

  getMisGrupos(): Observable<MiGrupoInstructorDTO[]> {
    return this.http.get<MiGrupoInstructorDTO[]>(`${this.apiUrl}/grupo/misGrupos`).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );
  }
}
