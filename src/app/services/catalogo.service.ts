import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { interpretarListado } from '../shared/listado-vacio.util';

/** Catálogo público de facultades y programas que alimenta el formulario de registro. */
@Injectable({
  providedIn: 'root'
})
export class CatalogoService {

  private url = 'http://127.0.0.1:8082/api/v2';

  constructor(private http: HttpClient) { }

  getFacultades(): Observable<string[]> {
    return this.http.get<unknown>(`${this.url}/facultades`).pipe(
      map(cuerpo => this.nombres(cuerpo, 'facultades'))
    );
  }

  getProgramas(facultad: string): Observable<string[]> {
    const params = new HttpParams().set('facultad', facultad);
    return this.http.get<unknown>(`${this.url}/programas`, { params }).pipe(
      map(cuerpo => this.nombres(cuerpo, 'programas'))
    );
  }

  /** Un cuerpo que no se puede interpretar es un error: nunca se toma por "no hay registros". */
  private nombres(cuerpo: unknown, que: string): string[] {
    const lista = interpretarListado<{ nombre: string }>(cuerpo);
    if (lista === null) {
      throw new Error(`No se pudo interpretar la respuesta de ${que}`);
    }
    return lista.map(e => e.nombre).sort((a, b) => a.localeCompare(b, 'es'));
  }
}
