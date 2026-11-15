/**
 * Estado de carga de una lista con imágenes: distingue "cargando", "cargada" (puede estar vacía) y "error", y lleva la
 * cuenta de las imágenes que faltan por llegar para mostrar su esqueleto.
 */
export class CargaLista {
  cargando = false;
  cargada = false;
  error = false;

  private readonly imagenes = new Set<string>();
  private avisoDeImagenDado = false;

  /** Empieza una carga nueva (también al recargar la lista). */
  iniciar(): void {
    this.cargando = true;
    this.cargada = false;
    this.error = false;
    this.imagenes.clear();
    this.avisoDeImagenDado = false;
  }

  terminar(): void {
    this.cargando = false;
    this.cargada = true;
    this.error = false;
  }

  fallar(): void {
    this.cargando = false;
    this.cargada = false;
    this.error = true;
  }

  esperarImagen(clave: string): void {
    this.imagenes.add(clave);
  }

  imagenLista(clave: string): void {
    this.imagenes.delete(clave);
  }

  imagenPendiente(clave: string): boolean {
    return this.imagenes.has(clave);
  }

  /** Registra una imagen fallida. Devuelve true solo la primera vez en cada carga, para avisar una sola vez. */
  imagenFallida(clave: string): boolean {
    this.imagenes.delete(clave);
    if (this.avisoDeImagenDado) return false;
    this.avisoDeImagenDado = true;
    return true;
  }
}
