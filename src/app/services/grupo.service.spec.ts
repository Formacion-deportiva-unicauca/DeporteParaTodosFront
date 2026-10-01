import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GrupoService } from './grupo.service';
import { GrupoDTO } from '../Models/DTOs/grupo-dto';

describe('GrupoService', () => {
  let service: GrupoService;
  let httpMock: HttpTestingController;
  const API = 'http://127.0.0.1:8082/api/v2';

  const grupoDummy: GrupoDTO = {
    categoria: 'Acuáticos',
    curso: 'Natación',
    anio: 2026,
    iterable: 1,
    periodo: 1,
    cupos: 20,
    fechaCreacion: '2026-01-01',
    idInstructor: 'INS01',
    nombreInstructor: 'Carlos López',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GrupoService],
    });
    service = TestBed.inject(GrupoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // ── getGrupos ─────────────────────────────────────────────────────────────

  it('getGrupos: GET /gruposCurso con params encodeados y retorna lista', () => {
    service.getGrupos('Acuáticos', 'Natación').subscribe(grupos => {
      expect(grupos.length).toBe(1);
      expect(grupos[0].iterable).toBe(1);
    });
    const req = httpMock.expectOne(
      `${API}/gruposCurso?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n`
    );
    expect(req.request.method).toBe('GET');
    req.flush([grupoDummy]);
  });

  it('getGrupos: propaga error HTTP 404', () => {
    let errorCapturado: any;
    service.getGrupos('Acuáticos', 'Natación').subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/gruposCurso?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n`
    );
    req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
    expect(errorCapturado).toBeTruthy();
  });

  // ── createGrupo ───────────────────────────────────────────────────────────

  it('createGrupo: POST /grupo con body correcto', () => {
    service.createGrupo(grupoDummy).subscribe(resp => {
      expect(resp.curso).toBe('Natación');
      expect(resp.cupos).toBe(20);
    });
    const req = httpMock.expectOne(`${API}/grupo`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(grupoDummy);
    req.flush(grupoDummy);
  });

  it('createGrupo: propaga error HTTP 409 (grupo duplicado)', () => {
    let errorCapturado: any;
    service.createGrupo(grupoDummy).subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(`${API}/grupo`);
    req.flush('Ya existe', { status: 409, statusText: 'Conflict' });
    expect(errorCapturado).toBeTruthy();
  });

  it('createGrupo: propaga error HTTP 500', () => {
    let errorCapturado: any;
    service.createGrupo(grupoDummy).subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(`${API}/grupo`);
    req.flush('Error interno', { status: 500, statusText: 'Server Error' });
    expect(errorCapturado).toBeTruthy();
  });

  // ── getGrupo ──────────────────────────────────────────────────────────────

  it('getGrupo: GET /grupo con los 4 params correctos', () => {
    service.getGrupo('Acuáticos', 'Natación', 2026, 1).subscribe(g => {
      expect(g.anio).toBe(2026);
      expect(g.iterable).toBe(1);
    });
    const req = httpMock.expectOne(
      `${API}/grupo?categoria=Acu%C3%A1ticos&curso=Nataci%C3%B3n&anio=2026&iterable=1`
    );
    expect(req.request.method).toBe('GET');
    req.flush(grupoDummy);
  });

  it('getGrupo: propaga error HTTP 404 (grupo no existe)', () => {
    let errorCapturado: any;
    service.getGrupo('Acuáticos', 'Natación', 2025, 9).subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/grupo?categoria=Acu%C3%A1ticos&curso=Nataci%C3%B3n&anio=2025&iterable=9`
    );
    req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
    expect(errorCapturado).toBeTruthy();
  });

  // ── updateGrupo ───────────────────────────────────────────────────────────

  it('updateGrupo: PUT /grupo con los 4 params de query y body correcto', () => {
    const actualizado: GrupoDTO = { ...grupoDummy, cupos: 30 };
    service.updateGrupo('Acuáticos', 'Natación', 2026, 1, actualizado).subscribe(resp => {
      expect(resp.cupos).toBe(30);
    });
    const req = httpMock.expectOne(
      `${API}/grupo?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n&anio=2026&iterable=1`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(actualizado);
    req.flush(actualizado);
  });

  it('updateGrupo: propaga error HTTP 404 (grupo no existe)', () => {
    let errorCapturado: any;
    service.updateGrupo('Acuáticos', 'Natación', 2026, 1, grupoDummy).subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/grupo?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n&anio=2026&iterable=1`
    );
    req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
    expect(errorCapturado).toBeTruthy();
  });

  // ── deleteGrupo ───────────────────────────────────────────────────────────
  // Backend: DELETE /api/v2/grupo?categoria=X&curso=Y&anio=N&iterable=N
  // (nombres exactos de @RequestParam en GrupoRest.java — sin prefijo "prm")

  it('deleteGrupo: DELETE /grupo con los 4 params exactos del backend', () => {
    service.deleteGrupo('Acuáticos', 'Natación', 2026, 1).subscribe(resp => {
      expect(resp.anio).toBe(2026);
    });
    const req = httpMock.expectOne(
      `${API}/grupo?categoria=Acu%C3%A1ticos&curso=Nataci%C3%B3n&anio=2026&iterable=1`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(grupoDummy);
  });

  it('deleteGrupo: propaga error HTTP 409 (grupo ya eliminado)', () => {
    let errorCapturado: any;
    service.deleteGrupo('Acuáticos', 'Natación', 2026, 1).subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/grupo?categoria=Acu%C3%A1ticos&curso=Nataci%C3%B3n&anio=2026&iterable=1`
    );
    req.flush('Conflicto', { status: 409, statusText: 'Conflict' });
    expect(errorCapturado).toBeTruthy();
  });
});
