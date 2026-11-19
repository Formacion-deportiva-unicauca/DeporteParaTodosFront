import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReporteMensualService } from './reporte-mensual.service';
import { filtrosVacios } from '../shared/reporte-mensual.util';
import { environment } from '../../environments/environment';

describe('ReporteMensualService', () => {
  let servicio: ReporteMensualService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    servicio = TestBed.inject(ReporteMensualService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('pide GET /reportes/mensual con año y mes, y sin parámetros de filtros vacíos', () => {
    servicio.getMensual(filtrosVacios('2026-10')).subscribe();
    const req = http.expectOne(r => r.url === `${environment.apiUrl}/reportes/mensual`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('anio')).toBe('2026');
    expect(req.request.params.get('mes')).toBe('10');
    expect(req.request.params.keys().sort()).toEqual(['anio', 'mes']);
    req.flush({});
  });

  it('manda cada filtro con su nombre; el vínculo se repite y el agrupar solo cuando está marcado', () => {
    servicio.getMensual({ mes: '2026-03', disciplina: 'Voleibol', modalidad: 'Semillero', publico: 'MIXTO', vinculos: ['Docente', 'Contratista'],
      agruparFuncionarios: true, genero: 'F', facultad: 'Ingeniería Civil' }).subscribe();
    const req = http.expectOne(r => r.url === `${environment.apiUrl}/reportes/mensual`);
    const p = req.request.params;
    expect(p.get('anio')).toBe('2026');
    expect(p.get('mes')).toBe('3');
    expect(p.get('disciplina')).toBe('Voleibol');
    expect(p.get('modalidad')).toBe('Semillero');
    expect(p.get('publico')).toBe('MIXTO');
    expect(p.getAll('vinculo')).toEqual(['Docente', 'Contratista']);
    expect(p.get('genero')).toBe('F');
    expect(p.get('facultad')).toBe('Ingeniería Civil');
    expect(p.get('agruparFuncionarios')).toBe('true');
    req.flush({});
  });

  it('pide las opciones de los filtros', () => {
    servicio.getOpciones().subscribe(o => expect(o.primerMes).toBe('2026-10'));
    const req = http.expectOne(`${environment.apiUrl}/reportes/mensual/opciones`);
    expect(req.request.method).toBe('GET');
    req.flush({ primerMes: '2026-10', ultimoMes: '2026-11', disciplinas: [], modalidades: [], publicos: [], vinculos: [], facultades: [] });
  });
});
