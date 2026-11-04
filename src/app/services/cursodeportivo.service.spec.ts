import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CursodeportivoService } from './cursodeportivo.service';
import { CursoDTO } from '../Models/DTOs/curso-dto';

describe('CursodeportivoService', () => {
  let service: CursodeportivoService;
  let httpMock: HttpTestingController;
  const API = 'http://127.0.0.1:8082/api/v2';

  const cursoDummy: CursoDTO = {
    nombre: 'Natación',
    deporte: 'Natación',
    categoriaCurso: 'Acuáticos',
    descripcion: 'Curso de natación',
    estadoCurso: 'ACTIVO',
    estadoInscripciones: 'ABIERTO',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CursodeportivoService],
    });
    service = TestBed.inject(CursodeportivoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // getAllCursos
  it('getAllCursos: GET /cursos y retorna lista', () => {
    service.getAllCursos().subscribe(cursos => {
      expect(cursos.length).toBe(1);
      expect(cursos[0].nombre).toBe('Natación');
    });
    const req = httpMock.expectOne(`${API}/cursos`);
    expect(req.request.method).toBe('GET');
    req.flush([cursoDummy]);
  });

  // getCursos
  it('getCursos: GET con prmCategoria encodeado correctamente', () => {
    service.getCursos('Acuáticos').subscribe(cursos => {
      expect(cursos).toEqual([cursoDummy]);
    });
    const req = httpMock.expectOne(`${API}/cursosbycategoria?prmCategoria=Acu%C3%A1ticos`);
    expect(req.request.method).toBe('GET');
    req.flush([cursoDummy]);
  });

  // getTodosCursosDeCategoria
  it('getTodosCursosDeCategoria: GET incluye cursos inactivos', () => {
    const inactivo: CursoDTO = { ...cursoDummy, estadoCurso: 'INACTIVO' };
    service.getTodosCursosDeCategoria('Acuáticos').subscribe(cursos => {
      expect(cursos.length).toBe(2);
    });
    const req = httpMock.expectOne(`${API}/cursosbycategoria/todos?prmCategoria=Acu%C3%A1ticos`);
    expect(req.request.method).toBe('GET');
    req.flush([cursoDummy, inactivo]);
  });

  it('getTodosCursosDeCategoria: propaga error HTTP', () => {
    let errorCapturado: any;
    service.getTodosCursosDeCategoria('Acuáticos').subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(`${API}/cursosbycategoria/todos?prmCategoria=Acu%C3%A1ticos`);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorCapturado).toBeTruthy();
  });

  // crearCurso
  it('crearCurso: POST /curso con body correcto', () => {
    service.crearCurso(cursoDummy).subscribe(resp => {
      expect(resp.nombre).toBe('Natación');
    });
    const req = httpMock.expectOne(`${API}/curso`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(cursoDummy);
    req.flush(cursoDummy);
  });

  // getCurso
  it('getCurso: GET con categoria y curso encodeados', () => {
    service.getCurso('Acuáticos', 'Natación').subscribe(c => {
      expect(c.nombre).toBe('Natación');
    });
    const req = httpMock.expectOne(
      `${API}/curso?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n`
    );
    expect(req.request.method).toBe('GET');
    req.flush(cursoDummy);
  });

  it('getCurso: propaga error HTTP', () => {
    let errorCapturado: any;
    service.getCurso('Acuáticos', 'NoExiste').subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/curso?prmCategoria=Acu%C3%A1ticos&prmCurso=NoExiste`
    );
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    expect(errorCapturado).toBeTruthy();
  });

  // updateCurso
  it('updateCurso: PUT con URL y body correctos', () => {
    const actualizado: CursoDTO = { ...cursoDummy, descripcion: 'Actualizado' };
    service.updateCurso('Acuáticos', 'Natación', actualizado).subscribe(resp => {
      expect(resp.descripcion).toBe('Actualizado');
    });
    const req = httpMock.expectOne(
      `${API}/curso?categoria=Acu%C3%A1ticos&curso=Nataci%C3%B3n`
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(actualizado);
    req.flush(actualizado);
  });

  it('updateCurso: propaga error HTTP', () => {
    let errorCapturado: any;
    service.updateCurso('Acuáticos', 'Natación', cursoDummy).subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/curso?categoria=Acu%C3%A1ticos&curso=Nataci%C3%B3n`
    );
    req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    expect(errorCapturado).toBeTruthy();
  });

  // deleteCurso
  it('deleteCurso: DELETE con categoria y curso encodeados', () => {
    service.deleteCurso('Acuáticos', 'Natación').subscribe(resp => {
      expect(resp).toBeDefined();
    });
    const req = httpMock.expectOne(
      `${API}/curso?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n`
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(cursoDummy);
  });

  it('deleteCurso: propaga error HTTP', () => {
    let errorCapturado: any;
    service.deleteCurso('Acuáticos', 'Natación').subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/curso?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n`
    );
    req.flush('Conflict', { status: 409, statusText: 'Conflict' });
    expect(errorCapturado).toBeTruthy();
  });

  // cambiarEstadoCurso
  it('cambiarEstadoCurso: PATCH con estado ACTIVO', () => {
    service.cambiarEstadoCurso('Acuáticos', 'Natación', 'ACTIVO').subscribe(resp => {
      expect(resp.estadoCurso).toBe('ACTIVO');
    });
    const req = httpMock.expectOne(
      `${API}/curso/estado?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n&prmEstado=ACTIVO`
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toBeNull();
    req.flush({ ...cursoDummy, estadoCurso: 'ACTIVO' });
  });

  it('cambiarEstadoCurso: PATCH con estado INACTIVO', () => {
    service.cambiarEstadoCurso('Acuáticos', 'Natación', 'INACTIVO').subscribe(resp => {
      expect(resp.estadoCurso).toBe('INACTIVO');
    });
    const req = httpMock.expectOne(
      `${API}/curso/estado?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n&prmEstado=INACTIVO`
    );
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...cursoDummy, estadoCurso: 'INACTIVO' });
  });

  it('cambiarEstadoCurso: propaga error HTTP', () => {
    let errorCapturado: any;
    service.cambiarEstadoCurso('Acuáticos', 'Natación', 'ACTIVO').subscribe({
      next: () => fail('debería haber fallado'),
      error: err => (errorCapturado = err),
    });
    const req = httpMock.expectOne(
      `${API}/curso/estado?prmCategoria=Acu%C3%A1ticos&prmCurso=Nataci%C3%B3n&prmEstado=ACTIVO`
    );
    req.flush('Error', { status: 500, statusText: 'Server Error' });
    expect(errorCapturado).toBeTruthy();
  });

  // Fase 3: el estado de inscripciones del curso se calcula a partir de sus grupos; ya no se cambia a mano.
  it('ya no existe cambiarEstadoInscripciones (el estado del curso lo deriva el backend)', () => {
    expect((service as any).cambiarEstadoInscripciones).toBeUndefined();
  });
});
