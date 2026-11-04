import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, throwError, tap } from 'rxjs';
import { CursoDTO } from '../Models/DTOs/curso-dto';

@Injectable({
  providedIn: 'root',
})
export class CursodeportivoService {
  private apiUrl = 'http://127.0.0.1:8082/api/v2';

  constructor(private http: HttpClient) { }

  getAllCursos(): Observable<CursoDTO[]> {
    return this.http.get<CursoDTO[]>(`${this.apiUrl}/cursos`).pipe(
    );
  }

  getCursos(prmCategoria: string): Observable<CursoDTO[]> {
    return this.http.get<CursoDTO[]>(`${this.apiUrl}/cursosbycategoria?prmCategoria=${encodeURIComponent(prmCategoria)}`).pipe(
    );
  }

  getTodosCursosDeCategoria(prmCategoria: string): Observable<CursoDTO[]> {
    return this.http.get<CursoDTO[]>(`${this.apiUrl}/cursosbycategoria/todos?prmCategoria=${encodeURIComponent(prmCategoria)}`).pipe(
      catchError((error) => throwError(error))
    );
  }

  crearCurso(curso: CursoDTO): Observable<CursoDTO> {
    console.log("curso en el service", curso);
    return this.http.post<CursoDTO>(`${this.apiUrl}/curso`, curso).pipe(
    );
  }

  getCurso(categoria: string, nombreCurso: string): Observable<CursoDTO> {
    return this.http.get<CursoDTO>(`${this.apiUrl}/curso?prmCategoria=${encodeURIComponent(categoria)}&prmCurso=${encodeURIComponent(nombreCurso)}`).pipe(
      catchError((error) => {
        console.error('Se produjo un error al recuperar el elemento ');
        return throwError(error);
      })
    );
  }

  updateCurso(categoria: string, cursoNombre: string, curso: CursoDTO): Observable<CursoDTO> {
    return this.http
      .put<CursoDTO>(`${this.apiUrl}/curso?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(cursoNombre)}`, curso)
      .pipe(
        catchError((error) => {
          console.error(
            'Se produjo un error al actualizar el elemento ',
            cursoNombre
          );
          return throwError(error);
        })
      );
  }

  deleteCurso(categoria: string, identificador: string): Observable<CursoDTO> {
    return this.http.delete<CursoDTO>(`${this.apiUrl}/curso?prmCategoria=${encodeURIComponent(categoria)}&prmCurso=${encodeURIComponent(identificador)}`).pipe(
      catchError((error) => throwError(error))
    );
  }

  cambiarEstadoCurso(categoria: string, curso: string, estado: 'ACTIVO' | 'INACTIVO' | 'CERRADO'): Observable<CursoDTO> {
    return this.http.patch<CursoDTO>(
      `${this.apiUrl}/curso/estado?prmCategoria=${encodeURIComponent(categoria)}&prmCurso=${encodeURIComponent(curso)}&prmEstado=${estado}`,
      null
    ).pipe(
      catchError((error) => throwError(error))
    );
  }
}
