// HALLAZGO DE CALIDAD: ClaseService no tiene catchError en ninguno de sus métodos
// (el .pipe() está vacío). Los errores HTTP fluyen sin transformar hacia el suscriptor.
// Esto es inconsistente con el patrón del resto de servicios del proyecto (GrupoService,
// HorarioService, etc. que sí usan catchError + throwError).
// Documentado aquí como observación — NO corregido, fuera del alcance de estos tests.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClaseService } from './clase.service';
import { ClaseDTO } from '../Models/DTOs/clase-dto';

describe('ClaseService', () => {
  let service: ClaseService;
  let httpMock: HttpTestingController;
  const API = 'http://127.0.0.1:8082/api/v2';

  const claseDummy: ClaseDTO = {
    codigo: 0,
    idGrupoCategoria: 'Acuáticos',
    idGrupoCurso: 'Natación',
    idGrupoAnio: 2026,
    idGrupoIterable: 1,
    idInstructor: 'INS01',
    fecha: '2026-08-20',
    horas: 2,
    minutos: 0,
    observacion: 'Clase regular',
    eliminado: 0,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ClaseService],
    });
    service = TestBed.inject(ClaseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // ── postClase ─────────────────────────────────────────────────────────────

  it('postClase: POST /claseGrupo con body correcto', () => {
    service.postClase(claseDummy).subscribe(resp => {
      expect(resp.idGrupoCategoria).toBe('Acuáticos');
      expect(resp.idInstructor).toBe('INS01');
    });
    const req = httpMock.expectOne(`${API}/claseGrupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(claseDummy);
    req.flush(claseDummy);
  });

  it('postClase: propaga error HTTP sin transformar (sin catchError — ver hallazgo al inicio del archivo)', () => {
    let errorCapturado: any;
    service.postClase(claseDummy).subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(`${API}/claseGrupo`);
    req.flush('Error interno', { status: 500, statusText: 'Server Error' });
    expect(errorCapturado).toBeTruthy();
  });

  // ── getClase ──────────────────────────────────────────────────────────────

  it('getClase: GET /clasesGrupo con categoria/curso encodeados y anio/iterable numérico', () => {
    service.getClase('Acuáticos', 'Natación', 2026, 1).subscribe(resp => {
      expect(resp[0].idGrupoCurso).toBe('Natación');
    });
    const req = httpMock.expectOne(
      `${API}/clasesGrupo?categoria=Acu%C3%A1ticos&curso=Nataci%C3%B3n&anio=2026&iterable=1`
    );
    expect(req.request.method).toBe('GET');
    req.flush([claseDummy]);
  });

  it('getClase: propaga error HTTP sin transformar (sin catchError — ver hallazgo al inicio del archivo)', () => {
    let errorCapturado: any;
    service.getClase('Acuáticos', 'Natación', 2026, 1).subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/clasesGrupo?categoria=Acu%C3%A1ticos&curso=Nataci%C3%B3n&anio=2026&iterable=1`
    );
    req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
    expect(errorCapturado).toBeTruthy();
  });
});
