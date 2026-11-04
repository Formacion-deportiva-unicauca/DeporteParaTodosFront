import { PerfilDTO } from '../Models/DTOs/perfil-tdo';
import {
  TIPOS_VINCULO,
  datosSegunTipo,
  requiereCodigo,
  requiereDependencia,
  requiereFacultadYPrograma,
} from './tipo-vinculo';

const base: PerfilDTO = {
  id: 1,
  nombre: 'Ana Ruiz',
  correo: 'ana@unicauca.edu.co',
  tipoId: 'CC',
  sexo: 'F',
  facultad: 'Facultad de Ingeniería Civil',
  tipoAlumno: 'Estudiante',
  role: '',
  alumnoCodigo: '104612',
  programa: 'Ingeniería Civil',
  dependencia: 'Oficina de Planeación',
};

describe('tipo-vinculo', () => {
  it('ofrece los cuatro tipos de vínculo', () => {
    expect(TIPOS_VINCULO).toEqual(['Estudiante', 'Docente', 'Administrativo', 'Contratista']);
  });

  it('el código institucional solo lo pide el Estudiante', () => {
    expect(requiereCodigo('Estudiante')).toBeTrue();
    ['Docente', 'Administrativo', 'Contratista', '', null, undefined].forEach(t => expect(requiereCodigo(t)).toBeFalse());
  });

  it('facultad y programa los piden el Estudiante y el Docente', () => {
    expect(requiereFacultadYPrograma('Estudiante')).toBeTrue();
    expect(requiereFacultadYPrograma('Docente')).toBeTrue();
    ['Administrativo', 'Contratista', '', null, undefined].forEach(t => expect(requiereFacultadYPrograma(t)).toBeFalse());
  });

  it('la dependencia la piden el Administrativo y el Contratista', () => {
    expect(requiereDependencia('Administrativo')).toBeTrue();
    expect(requiereDependencia('Contratista')).toBeTrue();
    ['Estudiante', 'Docente', '', null, undefined].forEach(t => expect(requiereDependencia(t)).toBeFalse());
  });

  describe('datosSegunTipo()', () => {
    it('Estudiante conserva código, facultad y programa y descarta la dependencia', () => {
      const r = datosSegunTipo({ ...base, tipoAlumno: 'Estudiante' });
      expect(r.alumnoCodigo).toBe('104612');
      expect(r.facultad).toBe('Facultad de Ingeniería Civil');
      expect(r.programa).toBe('Ingeniería Civil');
      expect(r.dependencia).toBe('');
    });

    it('Docente conserva facultad y programa y descarta código y dependencia', () => {
      const r = datosSegunTipo({ ...base, tipoAlumno: 'Docente' });
      expect(r.alumnoCodigo).toBe('');
      expect(r.facultad).toBe('Facultad de Ingeniería Civil');
      expect(r.programa).toBe('Ingeniería Civil');
      expect(r.dependencia).toBe('');
    });

    it('Administrativo y Contratista conservan solo la dependencia', () => {
      ['Administrativo', 'Contratista'].forEach(tipo => {
        const r = datosSegunTipo({ ...base, tipoAlumno: tipo });
        expect(r.alumnoCodigo).toBe('');
        expect(r.facultad).toBe('');
        expect(r.programa).toBe('');
        expect(r.dependencia).toBe('Oficina de Planeación');
      });
    });

    it('un tipo desconocido no envía ningún dato dependiente del tipo', () => {
      const r = datosSegunTipo({ ...base, tipoAlumno: 'Otro' });
      expect([r.alumnoCodigo, r.facultad, r.programa, r.dependencia]).toEqual(['', '', '', '']);
    });

    it('no modifica el perfil recibido y conserva el resto de los campos', () => {
      const original = { ...base, tipoAlumno: 'Administrativo' };
      const r = datosSegunTipo(original);
      expect(original.alumnoCodigo).toBe('104612');
      expect(r.nombre).toBe('Ana Ruiz');
      expect(r.tipoAlumno).toBe('Administrativo');
    });

    it('trata programa y dependencia indefinidos como vacíos', () => {
      const sinOpcionales: PerfilDTO = { ...base, tipoAlumno: 'Estudiante', programa: undefined, dependencia: undefined };
      const r = datosSegunTipo(sinOpcionales);
      expect(r.programa).toBe('');
      expect(r.dependencia).toBe('');
    });
  });
});
