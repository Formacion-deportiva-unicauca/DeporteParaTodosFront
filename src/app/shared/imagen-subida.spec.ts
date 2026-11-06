import { TAMANO_MAX_IMAGEN_MB, TIPOS_IMAGEN, validarImagen } from './imagen-subida';

describe('validarImagen (antes de subir la imagen al servidor)', () => {
  const MB = 1024 * 1024;

  it('el máximo es 5 MB, por debajo del límite de 10 MB del servidor', () => {
    expect(TAMANO_MAX_IMAGEN_MB).toBe(5);
  });

  it('acepta JPG, PNG y WebP', () => {
    expect(TIPOS_IMAGEN).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    for (const type of TIPOS_IMAGEN) {
      expect(validarImagen({ type, size: 1 * MB })).toBeNull();
    }
  });

  it('rechaza archivos que no son imágenes, con un mensaje que dice qué formatos se aceptan', () => {
    const mensaje = validarImagen({ type: 'application/pdf', size: 1000 });
    expect(mensaje).toContain('no es una imagen válida');
    expect(mensaje).toContain('JPG, PNG o WebP');
  });

  it('rechaza imágenes de otros formatos (GIF, SVG)', () => {
    expect(validarImagen({ type: 'image/gif', size: 1000 })).not.toBeNull();
    expect(validarImagen({ type: 'image/svg+xml', size: 1000 })).not.toBeNull();
  });

  it('rechaza imágenes de más de 5 MB e indica cuánto pesan', () => {
    const mensaje = validarImagen({ type: 'image/png', size: 6.5 * MB });
    expect(mensaje).toContain('6,5 MB');
    expect(mensaje).toContain('máximo es 5 MB');
  });

  it('acepta una imagen de exactamente 5 MB', () => {
    expect(validarImagen({ type: 'image/png', size: 5 * MB })).toBeNull();
  });
});
