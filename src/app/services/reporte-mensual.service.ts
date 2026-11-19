import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FiltrosReporte, OpcionesReporteDTO, ReporteMensualDTO } from '../Models/DTOs/reporte-mensual-dto';

/** Reporte mensual de estadísticas (solo Coordinador: el backend responde 403 a cualquier otro rol). */
@Injectable({ providedIn: 'root' })
export class ReporteMensualService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getMensual(filtros: FiltrosReporte): Observable<ReporteMensualDTO> {
    const [anio, mes] = filtros.mes.split('-').map(Number);
    let params = new HttpParams().set('anio', anio).set('mes', mes);
    if (filtros.disciplina) params = params.set('disciplina', filtros.disciplina);
    if (filtros.modalidad) params = params.set('modalidad', filtros.modalidad);
    if (filtros.publico) params = params.set('publico', filtros.publico);
    if (filtros.genero) params = params.set('genero', filtros.genero);
    if (filtros.facultad) params = params.set('facultad', filtros.facultad);
    filtros.vinculos.forEach(v => (params = params.append('vinculo', v)));
    if (filtros.agruparFuncionarios) params = params.set('agruparFuncionarios', true);
    return this.http.get<ReporteMensualDTO>(`${this.apiUrl}/reportes/mensual`, { params });
  }

  getOpciones(): Observable<OpcionesReporteDTO> {
    return this.http.get<OpcionesReporteDTO>(`${this.apiUrl}/reportes/mensual/opciones`);
  }
}
