import { nombreDia, nombrePropio } from './texto-nombre.util';

describe('texto-nombre.util', () => {
  it('nombrePropio convierte mayúsculas y minúsculas sueltas en nombre propio', () => {
    expect(nombrePropio('KATERINN NATALIA ARCOS DAZA')).toBe('Katerinn Natalia Arcos Daza');
    expect(nombrePropio('edynson munoz jimenez')).toBe('Edynson Munoz Jimenez');
  });

  it('deja en minúscula las palabras menores salvo al inicio', () => {
    expect(nombrePropio('tenis DE mesa')).toBe('Tenis de Mesa');
    expect(nombrePropio('de la Selección y del Equipo')).toBe('De la Selección y del Equipo');
  });

  it('tolera espacios de más, vacío y nulos', () => {
    expect(nombrePropio('  ana   ruiz ')).toBe('Ana Ruiz');
    expect(nombrePropio('')).toBe('');
    expect(nombrePropio(null)).toBe('');
    expect(nombrePropio(undefined)).toBe('');
  });

  it('nombreDia restituye la tilde de los días y respeta lo desconocido', () => {
    expect(nombreDia('MIERCOLES')).toBe('Miércoles');
    expect(nombreDia('sabado')).toBe('Sábado');
    expect(nombreDia(' Lunes ')).toBe('Lunes');
    expect(nombreDia('Festivo')).toBe('Festivo');
    expect(nombreDia(null)).toBe('');
  });
});
