import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { InscripcionesService } from './inscripciones.service';
import { InscripcionEnEsperaDto } from '../Models/DTOs/inscripcion-en-espera-dto';
import { MiCursoDTO } from '../Models/DTOs/mis-cursos-dto';

describe('InscripcionesService', () => {
  let service: InscripcionesService;
  let httpMock: HttpTestingController;
  const base = 'http://127.0.0.1:8082/api/v2';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(InscripcionesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getListaEspera()', () => {
    it('hace GET a /inscripcion/listaEspera y retorna la lista', () => {
      const mockData: InscripcionEnEsperaDto[] = [
        { alumnoId: '42', nombre: 'Juan', correo: 'juan@test.com', fechaInscripcion: '2024-01-01' },
      ];

      let resultado: InscripcionEnEsperaDto[] | undefined;
      service.getListaEspera('Futbol', 'Avanzado', 2024, 1).subscribe(data => {
        resultado = data;
      });

      const req = httpMock.expectOne(r => r.url.includes('/inscripcion/listaEspera'));
      expect(req.request.method).toBe('GET');
      req.flush(mockData);

      expect(resultado).toEqual(mockData);
    });

    it('propaga el error del servidor cuando getListaEspera falla', () => {
      let errorCapturado = false;
      service.getListaEspera('Futbol', 'Avanzado', 2024, 1).subscribe({
        next: () => {},
        error: () => { errorCapturado = true; },
      });

      const req = httpMock.expectOne(r => r.url.includes('/inscripcion/listaEspera'));
      req.flush('Error del servidor', { status: 500, statusText: 'Internal Server Error' });

      expect(errorCapturado).toBeTrue();
    });
  });

  describe('promoverAlumno()', () => {
    it('hace PATCH a /inscripcion/promover y retorna la inscripcion promovida', () => {
      const mockResp = { alumnoId: '42', categoria: 'Futbol' };

      let responded = false;
      service.promoverAlumno('42', 'Futbol', 'Avanzado', 2024, 1).subscribe(() => {
        responded = true;
      });

      const req = httpMock.expectOne(r => r.url.includes('/inscripcion/promover'));
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush(mockResp);

      expect(responded).toBeTrue();
    });

    it('propaga el error del servidor cuando promoverAlumno falla', () => {
      let errorCapturado = false;
      service.promoverAlumno('42', 'Futbol', 'Avanzado', 2024, 1).subscribe({
        next: () => {},
        error: () => { errorCapturado = true; },
      });

      const req = httpMock.expectOne(r => r.url.includes('/inscripcion/promover'));
      req.flush('Error del servidor', { status: 500, statusText: 'Internal Server Error' });

      expect(errorCapturado).toBeTrue();
    });
  });

  describe('getMisCursos()', () => {
    it('hace GET a /inscripcion/misCursos sin parámetros', () => {
      service.getMisCursos().subscribe();
      const req = httpMock.expectOne(`${base}/inscripcion/misCursos`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush([]);
    });

    it('retorna el array de cursos cuando el backend responde 200', () => {
      const mockData: MiCursoDTO[] = [
        {
          categoria: 'Futbol', curso: 'Avanzado', anio: 2024, iterable: 1,
          periodo: 1, estado: 'INSCRITO', nombreInstructor: 'Carlos', grupoActivo: true, horarios: [],
        },
      ];
      let result: MiCursoDTO[] | undefined;
      service.getMisCursos().subscribe(data => { result = data; });
      httpMock.expectOne(`${base}/inscripcion/misCursos`).flush(mockData);
      expect(result).toEqual(mockData);
    });

    it('retorna array vacío cuando el backend responde []', () => {
      let result: MiCursoDTO[] | undefined;
      service.getMisCursos().subscribe(data => { result = data; });
      httpMock.expectOne(`${base}/inscripcion/misCursos`).flush([]);
      expect(result).toEqual([]);
    });

    it('propaga el error 401 sin cuerpo JSON', () => {
      let errorStatus: number | undefined;
      service.getMisCursos().subscribe({ error: err => { errorStatus = err?.status; } });
      httpMock.expectOne(`${base}/inscripcion/misCursos`)
        .flush('', { status: 401, statusText: 'Unauthorized' });
      expect(errorStatus).toBe(401);
    });

    it('propaga el error 403 sin cuerpo JSON', () => {
      let errorStatus: number | undefined;
      service.getMisCursos().subscribe({ error: err => { errorStatus = err?.status; } });
      httpMock.expectOne(`${base}/inscripcion/misCursos`)
        .flush('', { status: 403, statusText: 'Forbidden' });
      expect(errorStatus).toBe(403);
    });
  });
});
