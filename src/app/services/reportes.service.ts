import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable} from 'rxjs';
import { EstadisticasDTO } from '../Models/DTOs/estadisticas-dto';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})

export class ReportesService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getEstadisticasCategoria(fechaInicio: string, fechaFin: string, categoria: string): Observable<EstadisticasDTO[]> {
        return this.http.get<EstadisticasDTO[]>(`${this.apiUrl}/estadisticas/categorias?inicio=${encodeURIComponent(fechaInicio)}&fin=${encodeURIComponent(fechaFin)}&categoria=${encodeURIComponent(categoria)}`).pipe(
        );
    }

    getEstadisticasCursos(fechaInicio: string, fechaFin: string, categoria: string, curso: string): Observable<EstadisticasDTO[]> {
        return this.http.get<EstadisticasDTO[]>(`${this.apiUrl}/estadisticas/cursos?inicio=${encodeURIComponent(fechaInicio)}&fin=${encodeURIComponent(fechaFin)}&categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}`).pipe(
        );
    }

    getEstadisticasGrupos(fechaInicio: string, fechaFin: string, categoria: string, curso: string, anio: number, iterable: number): Observable<EstadisticasDTO[]> {
        return this.http.get<EstadisticasDTO[]>(`${this.apiUrl}/estadisticas/grupos?inicio=${encodeURIComponent(fechaInicio)}&fin=${encodeURIComponent(fechaFin)}&categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`).pipe(
        );
    }

    getEstadisticasAlumno(fechaInicio: string, fechaFin: string, alumno: string): Observable<EstadisticasDTO[]> {
        return this.http.get<EstadisticasDTO[]>(`${this.apiUrl}/estadisticas/alumnos?inicio=${encodeURIComponent(fechaInicio)}&fin=${encodeURIComponent(fechaFin)}&alumno=${encodeURIComponent(alumno)}`).pipe(
        );
    }

    getEstadisticasInstructore(fechaInicio: string, fechaFin: string, instructor: string): Observable<EstadisticasDTO[]> {
        return this.http.get<EstadisticasDTO[]>(`${this.apiUrl}/estadisticas/instructores?inicio=${encodeURIComponent(fechaInicio)}&fin=${encodeURIComponent(fechaFin)}&instructor=${encodeURIComponent(instructor)}`).pipe(
        );
    }

    getEstadisticasFacultad(): void {

    }

    getEstadisticasPrograma(): void {

    }

}
