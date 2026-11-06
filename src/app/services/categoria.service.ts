import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, tap, throwError, BehaviorSubject } from 'rxjs';
import { CategoriaDTO } from '../Models/DTOs/categoria-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CategoriaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private categoria = new BehaviorSubject<string>('');
  varCategoria = this.categoria.asObservable();

  serCategoria(titulo: string): void {
    this.categoria.next(titulo);
  }

  getCategorias(): Observable<CategoriaDTO[]> {
    return this.http.get<CategoriaDTO[]>(`${this.apiUrl}/categorias2`).pipe(
    );
  }

  createCategoria(categoria: CategoriaDTO): Observable<CategoriaDTO> {
    return this.http.post<CategoriaDTO>(`${this.apiUrl}/categoria`, categoria).pipe(
    );
  }

  getCategoria(titulo: string): Observable<CategoriaDTO> {
    return this.http.get<CategoriaDTO>(`${this.apiUrl}/categoria?titulo=${titulo}`).pipe(
    );
  }

  updateCategoria(titulo: string, categoria: CategoriaDTO): Observable<CategoriaDTO> {
    return this.http.put<CategoriaDTO>(`${this.apiUrl}/categoria?titulo=${titulo}`, categoria).pipe(
    );
  }

  deleteCategoria(titulo: string): Observable<number> {
    return this.http.delete<number>(`${this.apiUrl}/categoria?titulo=${encodeURIComponent(titulo)}`).pipe(
    );
  }
}
