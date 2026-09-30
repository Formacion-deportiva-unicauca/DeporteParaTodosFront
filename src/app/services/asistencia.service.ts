import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { AtencionDTO } from '../Models/DTOs/atencion-dto';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaService {
  private apiUrl = 'http://127.0.0.1:8082/api/v2';

  constructor(private http: HttpClient) { }

  registrarAsistencias(idClase: number, atenciones: AtencionDTO[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/atenciones?idClase=${idClase}`, atenciones).pipe(
      catchError((error) => throwError(error))
    );
  }

  getAtencionesClase(claseid: number): Observable<AtencionDTO[]> {
    return this.http.get<AtencionDTO[]>(`${this.apiUrl}/atencionesporclase?claseid=${claseid}`).pipe(
      catchError((error) => throwError(error))
    );
  }

  eliminarAsistencia(prmPerfId: string, prmClsCodigo: number): Observable<AtencionDTO> {
    return this.http.delete<AtencionDTO>(
      `${this.apiUrl}/asistencia?prmPerfId=${encodeURIComponent(prmPerfId)}&prmClsCodigo=${prmClsCodigo}`
    ).pipe(
      catchError((error) => throwError(error))
    );
  }
}
