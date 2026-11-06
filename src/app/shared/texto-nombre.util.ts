const PALABRAS_MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'o', 'u', 'en', 'a', 'al']);

/**
 * Presenta nombres que llegan en mayúsculas o minúsculas sueltas ("KATERINN NATALIA ARCOS DAZA", "tenis de mesa")
 * como nombre propio: "Katerinn Natalia Arcos Daza", "Tenis de Mesa". Las siglas de dos letras o menos se respetan.
 */
export function nombrePropio(texto: string | null | undefined): string {
  return (texto ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((palabra, i) => {
      const minuscula = palabra.toLocaleLowerCase('es');
      if (i > 0 && PALABRAS_MENORES.has(minuscula)) return minuscula;
      return minuscula.charAt(0).toLocaleUpperCase('es') + minuscula.slice(1);
    })
    .join(' ');
}

const DIAS_CON_TILDE: Record<string, string> = {
  LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
};

/** "MIERCOLES" / "miércoles" → "Miércoles" (los horarios guardan el día sin tilde). Lo desconocido se devuelve tal cual. */
export function nombreDia(dia: string | null | undefined): string {
  const clave = (dia ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  return DIAS_CON_TILDE[clave] ?? (dia ?? '');
}
