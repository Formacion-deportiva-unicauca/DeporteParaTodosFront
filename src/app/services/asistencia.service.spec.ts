import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AsistenciaService } from './asistencia.service';
import { ConfirmacionAsistenciaRequestDTO } from '../Models/DTOs/confirmacion-asistencia-dto';

describe('AsistenciaService › confirmarAsistencia', () => {
  let service: AsistenciaService;
  let http: HttpTestingController;
  const url = 'http://127.0.0.1:8082/api/v2/clase/50/asistencia';
  const cuerpo: ConfirmacionAsistenciaRequestDTO = {
    asistencias: [{ idPerfil: '1', estaAtendido: true }, { idPerfil: '2', estaAtendido: false }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AsistenciaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía un PUT a /clase/{codigo}/asistencia con el cuerpo tal cual', () => {
    service.confirmarAsistencia(50, cuerpo).subscribe();
    const req = http.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(cuerpo);
    req.flush({ codigoClase: 50, confirmadaEn: '2026-10-15T12:00:00', presentes: 1, ausentes: 1 });
  });

  it('incluye confirmaTodosAusentes cuando se indica', () => {
    service.confirmarAsistencia(50, { asistencias: [], confirmaTodosAusentes: true }).subscribe();
    const req = http.expectOne(url);
    expect(req.request.body.confirmaTodosAusentes).toBeTrue();
    req.flush({});
  });

  it('devuelve la respuesta del servidor', () => {
    let respuesta: any;
    service.confirmarAsistencia(50, cuerpo).subscribe(r => (respuesta = r));
    http.expectOne(url).flush({ codigoClase: 50, confirmadaEn: '2026-10-15T12:00:00', presentes: 1, ausentes: 1 });
    expect(respuesta).toEqual({ codigoClase: 50, confirmadaEn: '2026-10-15T12:00:00', presentes: 1, ausentes: 1 });
  });

  it('propaga el error HTTP para que el componente muestre el mensaje', () => {
    let status = 0;
    service.confirmarAsistencia(50, cuerpo).subscribe({ error: e => (status = e.status) });
    http.expectOne(url).flush({ mensaje: 'x' }, { status: 422, statusText: 'Unprocessable' });
    expect(status).toBe(422);
  });
});
