import { descripcionInicio, etiquetaRol, leerTipoVinculoGuardado, tituloPanel } from './rol-usuario';

describe('rol-usuario', () => {
  afterEach(() => sessionStorage.removeItem('dpt_perfil'));

  describe('etiquetaRol: lo que se muestra al usuario', () => {
    it('Coordinador e Instructor se muestran tal cual', () => {
      expect(etiquetaRol('Coordinador')).toBe('Coordinador');
      expect(etiquetaRol('Instructor')).toBe('Instructor');
    });

    it('el rol Alumno se muestra con su tipo de vínculo: Estudiante, Docente, Administrativo o Contratista', () => {
      for (const tipo of ['Estudiante', 'Docente', 'Administrativo', 'Contratista']) {
        expect(etiquetaRol('Alumno', tipo)).toBe(tipo);
      }
    });

    it('nunca muestra "Alumno": sin tipo de vínculo conocido usa un texto neutro', () => {
      expect(etiquetaRol('Alumno')).toBe('Usuario');
      expect(etiquetaRol('Alumno', null)).toBe('Usuario');
      expect(etiquetaRol('Alumno', 'Otro')).toBe('Usuario');
    });

    it('el tipo de vínculo no cambia el rol de Coordinador ni de Instructor', () => {
      expect(etiquetaRol('Instructor', 'Docente')).toBe('Instructor');
      expect(etiquetaRol('Coordinador', 'Estudiante')).toBe('Coordinador');
    });

    it('sin rol devuelve cadena vacía', () => {
      expect(etiquetaRol('')).toBe('');
      expect(etiquetaRol(undefined)).toBe('');
    });
  });

  describe('leerTipoVinculoGuardado', () => {
    it('lee tipoAlumno del perfil guardado en la sesión', () => {
      sessionStorage.setItem('dpt_perfil', JSON.stringify({ id: 1, tipoAlumno: 'Docente' }));
      expect(leerTipoVinculoGuardado()).toBe('Docente');
    });

    it('devuelve null si no hay perfil guardado', () => {
      expect(leerTipoVinculoGuardado()).toBeNull();
    });

    it('devuelve null si el perfil guardado está dañado, sin lanzar error', () => {
      sessionStorage.setItem('dpt_perfil', '{no es json');
      expect(leerTipoVinculoGuardado()).toBeNull();
    });
  });

  describe('tituloPanel', () => {
    it('depende del rol y del tipo de vínculo', () => {
      expect(tituloPanel('Coordinador')).toBe('Panel de coordinación');
      expect(tituloPanel('Instructor')).toBe('Panel del instructor');
      expect(tituloPanel('Alumno', 'Estudiante')).toBe('Panel del estudiante');
      expect(tituloPanel('Alumno', 'Docente')).toBe('Panel del docente');
      expect(tituloPanel('Alumno', 'Administrativo')).toBe('Panel del administrativo');
      expect(tituloPanel('Alumno', 'Contratista')).toBe('Panel del contratista');
    });

    it('sin rol conocido no muestra título', () => {
      expect(tituloPanel('')).toBe('');
      expect(tituloPanel('Estudiante')).toBe('');
    });
  });

  describe('descripcionInicio: mensajes según lo que cada rol puede hacer', () => {
    it('Coordinador: administra categorías', () => {
      expect(descripcionInicio('Coordinador')).toBe(
        'Administre las categorías deportivas e ingrese a la información de cada programa desde este panel.');
    });

    it('Instructor: gestiona la asistencia y consulta los cursos a su cargo', () => {
      const texto = descripcionInicio('Instructor');
      expect(texto).toContain('asistencia');
      expect(texto).toContain('cursos a su cargo');
    });

    it('Alumno (cualquier vínculo): consulta sus cursos e inscribe', () => {
      const texto = descripcionInicio('Alumno');
      expect(texto).toContain('Consulte sus cursos');
      expect(texto).toContain('inscríbase');
    });

    it('visitante sin sesión: solo consulta las categorías', () => {
      expect(descripcionInicio('')).toContain('Consulte las categorías deportivas');
    });
  });
});
