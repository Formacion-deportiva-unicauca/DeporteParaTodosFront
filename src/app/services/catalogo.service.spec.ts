import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CatalogoService } from './catalogo.service';

const URL = 'http://127.0.0.1:8082/api/v2';
const LISTADO_VACIO = { codigoError: 'GC-0002', mensaje: 'No hay registros', codigoHttp: 200 };

describe('CatalogoService', () => {
  let service: CatalogoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CatalogoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('getFacultades()', () => {
    it('devuelve los nombres ordenados alfabéticamente', () => {
      let r: string[] | undefined;
      service.getFacultades().subscribe(v => (r = v));
      http.expectOne(`${URL}/facultades`).flush([{ nombre: 'Facultad de Artes' }, { nombre: 'Facultad de Derecho' }, { nombre: 'Facultad de Ciencias Agrarias' }]);
      expect(r).toEqual(['Facultad de Artes', 'Facultad de Ciencias Agrarias', 'Facultad de Derecho']);
    });

    it('el listado vacío (GC-0002) es una lista vacía', () => {
      let r: string[] | undefined;
      service.getFacultades().subscribe(v => (r = v));
      http.expectOne(`${URL}/facultades`).flush(LISTADO_VACIO);
      expect(r).toEqual([]);
    });

    it('una respuesta que no se puede interpretar es un error, no una lista vacía', () => {
      let error: unknown;
      service.getFacultades().subscribe({ error: e => (error = e) });
      http.expectOne(`${URL}/facultades`).flush({ algo: 'raro' });
      expect(error).toBeTruthy();
    });

    it('propaga el error HTTP', () => {
      let status: number | undefined;
      service.getFacultades().subscribe({ error: e => (status = e.status) });
      http.expectOne(`${URL}/facultades`).flush('x', { status: 500, statusText: 'Error' });
      expect(status).toBe(500);
    });
  });

  describe('getProgramas()', () => {
    it('consulta por facultad codificando el parámetro y devuelve los nombres', () => {
      let r: string[] | undefined;
      service.getProgramas('Facultad de Ciencias Contables, Económicas y Administrativas').subscribe(v => (r = v));
      const req = http.expectOne(x => x.url === `${URL}/programas`);
      expect(req.request.params.get('facultad')).toBe('Facultad de Ciencias Contables, Económicas y Administrativas');
      req.flush([{ nombre: 'Contaduría', facultad: 'X' }, { nombre: 'Administración', facultad: 'X' }]);
      expect(r).toEqual(['Administración', 'Contaduría']);
    });

    it('una facultad sin programas (GC-0002) devuelve una lista vacía', () => {
      let r: string[] | undefined;
      service.getProgramas('Facultad de Artes').subscribe(v => (r = v));
      http.expectOne(x => x.url === `${URL}/programas`).flush(LISTADO_VACIO);
      expect(r).toEqual([]);
    });

    it('una respuesta que no se puede interpretar es un error', () => {
      let error: unknown;
      service.getProgramas('Facultad de Artes').subscribe({ error: e => (error = e) });
      http.expectOne(x => x.url === `${URL}/programas`).flush('texto');
      expect(error).toBeTruthy();
    });
  });
});
