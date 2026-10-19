// Nota: la clase se llama "InstructorServisce" (typo: falta la 't' en Service).
// Es un candidato a renombrar, pero requeriría actualizar todos los imports que la usan —
// fuera de alcance por ahora.

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { InstructorServisce } from './instructor.service';
import { InstructorDTO } from '../Models/DTOs/instructor-dto';

describe('InstructorServisce', () => {
  let service: InstructorServisce;
  let httpMock: HttpTestingController;
  const API = 'http://127.0.0.1:8082/api/v2';

  const instructorDummy: InstructorDTO = {
    id: 'INS01',
    nombre: 'Carlos López',
    correo: 'carlos@unicauca.edu.co',
    sexo: 'M',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InstructorServisce],
    });
    service = TestBed.inject(InstructorServisce);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // ── getInstructores ───────────────────────────────────────────────────────

  it('getInstructores: GET /instructores y retorna lista', () => {
    service.getInstructores().subscribe(lista => {
      expect(lista.length).toBe(1);
      expect(lista[0].id).toBe('INS01');
    });
    const req = httpMock.expectOne(`${API}/instructores`);
    expect(req.request.method).toBe('GET');
    req.flush([instructorDummy]);
  });

  it('getInstructores: propaga error HTTP 500', () => {
    let errorCapturado: any;
    service.getInstructores().subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(`${API}/instructores`);
    req.flush('Error interno', { status: 500, statusText: 'Server Error' });
    expect(errorCapturado).toBeTruthy();
  });

  // ── getInstructor ─────────────────────────────────────────────────────────

  it('getInstructor: GET con id encodeado en query string', () => {
    service.getInstructor('INS01').subscribe(inst => {
      expect(inst.nombre).toBe('Carlos López');
    });
    const req = httpMock.expectOne(`${API}/instructor?idInstructor=INS01`);
    expect(req.request.method).toBe('GET');
    req.flush(instructorDummy);
  });

  it('getInstructor: encodeURIComponent se aplica cuando el id tiene caracteres especiales', () => {
    service.getInstructor('A B/C').subscribe();
    const req = httpMock.expectOne(`${API}/instructor?idInstructor=A%20B%2FC`);
    expect(req.request.method).toBe('GET');
    req.flush(instructorDummy);
  });

  it('getInstructor: propaga error HTTP 404 (instructor no existe)', () => {
    let errorCapturado: any;
    service.getInstructor('INEXISTENTE').subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(`${API}/instructor?idInstructor=INEXISTENTE`);
    req.flush('No encontrado', { status: 404, statusText: 'Not Found' });
    expect(errorCapturado).toBeTruthy();
  });

  // ── deleteInstructor ──────────────────────────────────────────────────────

  it('deleteInstructor: DELETE /instructor?instructorId=x', () => {
    service.deleteInstructor('INS01').subscribe();
    const req = httpMock.expectOne(`${API}/instructor?instructorId=INS01`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deleteInstructor: encodeURIComponent cuando el id tiene caracteres especiales', () => {
    service.deleteInstructor('A B').subscribe();
    const req = httpMock.expectOne(`${API}/instructor?instructorId=A%20B`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('deleteInstructor: propaga error HTTP 409', () => {
    let errorCapturado: any;
    service.deleteInstructor('INS01').subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(`${API}/instructor?instructorId=INS01`);
    req.flush('Conflicto', { status: 409, statusText: 'Conflict' });
    expect(errorCapturado).toBeTruthy();
  });

  // ── actualizarInstructor ──────────────────────────────────────────────────

  it('actualizarInstructor: PUT /api/v2/instructor/<id> con el cuerpo { nombre, correo } y devuelve el DTO', () => {
    const respuesta = { id: 'INS01', nombre: 'Carlos Pérez', correo: 'nuevo@unicauca.edu.co', sexo: 'M' };
    service.actualizarInstructor('INS01', { nombre: 'Carlos Pérez', correo: 'nuevo@unicauca.edu.co' })
      .subscribe(r => expect(r).toEqual(respuesta));
    const req = httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructor/INS01');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nombre: 'Carlos Pérez', correo: 'nuevo@unicauca.edu.co' });
    req.flush(respuesta);
  });

  it('actualizarInstructor: codifica el id en la ruta', () => {
    service.actualizarInstructor('A B/ñ', { nombre: 'x', correo: 'x@y.co' }).subscribe();
    const req = httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructor/A%20B%2F%C3%B1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('actualizarInstructor: propaga 409 con su cuerpo de error', () => {
    let error: any;
    service.actualizarInstructor('INS01', { nombre: 'x', correo: 'x@y.co' }).subscribe({ next: () => fail('debería fallar'), error: e => (error = e) });
    httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructor/INS01')
      .flush({ mensaje: 'correo en uso' }, { status: 409, statusText: 'Conflict' });
    expect(error.status).toBe(409);
    expect(error.error.mensaje).toBe('correo en uso');
  });

  // ── plazos de carga (SCRUM-80) ────────────────────────────────────────────

  it('getPlazosCarga: GET /api/v2/instructores/plazos-carga y devuelve el arreglo', () => {
    const plazos = [{
      idInstructor: 'INS01', anio: 2026, periodo: 2, fechaLimite: '2026-10-15',
      estadoReporte: 'PENDIENTE', plazoVencido: false, clasesConAsistencia: 0,
    }];
    service.getPlazosCarga().subscribe(r => expect(r).toEqual(plazos as any));
    const req = httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructores/plazos-carga');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush(plazos);
  });

  it('getPlazosCarga: propaga 403 sin cuerpo', () => {
    let error: any;
    service.getPlazosCarga().subscribe({ next: () => fail('debería fallar'), error: e => (error = e) });
    httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructores/plazos-carga').flush(null, { status: 403, statusText: 'Forbidden' });
    expect(error.status).toBe(403);
  });

  it('asignarPlazoCarga: PUT /api/v2/instructor/<id>/plazo-carga con { fechaLimite } y devuelve el elemento', () => {
    const respuesta = {
      idInstructor: 'INS01', anio: 2026, periodo: 2, fechaLimite: '2026-11-01',
      estadoReporte: 'PENDIENTE', plazoVencido: false, clasesConAsistencia: 0,
    };
    service.asignarPlazoCarga('INS01', '2026-11-01').subscribe(r => expect(r).toEqual(respuesta as any));
    const req = httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructor/INS01/plazo-carga');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ fechaLimite: '2026-11-01' });
    req.flush(respuesta);
  });

  it('asignarPlazoCarga: codifica el id en la ruta', () => {
    service.asignarPlazoCarga('A B/ñ', '2026-11-01').subscribe();
    const req = httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructor/A%20B%2F%C3%B1/plazo-carga');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('asignarPlazoCarga: propaga 422 con su cuerpo de error', () => {
    let error: any;
    service.asignarPlazoCarga('INS01', '2000-01-01').subscribe({ next: () => fail('debería fallar'), error: e => (error = e) });
    httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructor/INS01/plazo-carga')
      .flush({ mensaje: 'fecha pasada' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(error.status).toBe(422);
    expect(error.error.mensaje).toBe('fecha pasada');
  });

  // ── prórroga de registro (SCRUM-80 rediseñado) ────────────────────────────

  it('getProrrogasRegistro: GET /api/v2/instructores/prorroga-registro?anio=2026&mes=10', () => {
    const prorrogas = [{ idInstructor: 'x', dias: 10, fechaLimite: '2026-11-10' }];
    service.getProrrogasRegistro(2026, 10).subscribe(r => expect(r).toEqual(prorrogas));
    const req = httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructores/prorroga-registro?anio=2026&mes=10');
    expect(req.request.method).toBe('GET');
    req.flush(prorrogas);
  });

  it('getProrrogasRegistro: propaga 422 (mes futuro) con su cuerpo y 403 sin cuerpo', () => {
    let e422: any; let e403: any;
    service.getProrrogasRegistro(2099, 1).subscribe({ next: () => fail('debería fallar'), error: e => (e422 = e) });
    httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructores/prorroga-registro?anio=2099&mes=1')
      .flush({ mensaje: 'mes futuro' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(e422.status).toBe(422);
    expect(e422.error.mensaje).toBe('mes futuro');
    service.getProrrogasRegistro(2026, 10).subscribe({ next: () => fail('debería fallar'), error: e => (e403 = e) });
    httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructores/prorroga-registro?anio=2026&mes=10')
      .flush(null, { status: 403, statusText: 'Forbidden' });
    expect(e403.status).toBe(403);
  });

  it('asignarProrrogaRegistro: PUT /api/v2/instructores/prorroga-registro con el cuerpo completo y devuelve el arreglo', () => {
    const req = { idsInstructores: ['x', 'y'], anio: 2026, mes: 10, dias: 10 };
    const respuesta = [
      { idInstructor: 'x', dias: 10, fechaLimite: '2026-11-10' },
      { idInstructor: 'y', dias: 10, fechaLimite: '2026-11-10' },
    ];
    service.asignarProrrogaRegistro(req).subscribe(r => expect(r).toEqual(respuesta));
    const http = httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructores/prorroga-registro');
    expect(http.request.method).toBe('PUT');
    expect(http.request.body).toEqual(req);
    http.flush(respuesta);
  });

  it('asignarProrrogaRegistro: propaga 404 y 422 con su cuerpo', () => {
    const errores: any[] = [];
    for (const [status, cuerpo] of [[404, { mensaje: 'no existe' }], [422, { mensaje: 'mes futuro' }]] as const) {
      service.asignarProrrogaRegistro({ idsInstructores: ['x'], anio: 2026, mes: 10, dias: 0 })
        .subscribe({ next: () => fail('debería fallar'), error: e => errores.push(e) });
      httpMock.expectOne('http://127.0.0.1:8082/api/v2/instructores/prorroga-registro')
        .flush(cuerpo, { status, statusText: 'x' });
    }
    expect(errores.map(e => e.status)).toEqual([404, 422]);
    expect(errores[1].error.mensaje).toBe('mes futuro');
  });
});
