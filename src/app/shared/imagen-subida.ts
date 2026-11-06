/** Tamaño máximo de una imagen. El servidor admite hasta 10 MB por archivo; se deja un margen. */
export const TAMANO_MAX_IMAGEN_MB = 5;

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Valida una imagen ANTES de subirla, para avisar con claridad en lugar de fallar con un error genérico del servidor.
 * Devuelve el mensaje para el usuario, o null si la imagen es válida.
 */
export function validarImagen(archivo: { type: string; size: number }): string | null {
  if (!TIPOS_IMAGEN.includes(archivo.type)) {
    return 'El archivo no es una imagen válida. Use JPG, PNG o WebP.';
  }
  if (archivo.size > TAMANO_MAX_IMAGEN_MB * 1024 * 1024) {
    const peso = (archivo.size / (1024 * 1024)).toFixed(1).replace('.', ',');
    return `La imagen pesa ${peso} MB y el máximo es ${TAMANO_MAX_IMAGEN_MB} MB.`;
  }
  return null;
}
