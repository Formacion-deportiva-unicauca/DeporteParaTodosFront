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
});
