import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/**
 * Adaptador de fechas de los calendarios (MatDatepicker) para escribir y mostrar dd/MM/yyyy.
 *
 * NativeDateAdapter.parse usa Date.parse, que lee "01/11/2026" como 11 de enero (mes/día) y deja pasar textos
 * ambiguos. Aquí solo se acepta día/mes/año y las fechas inexistentes (31/02/2026) son inválidas.
 * Todo en hora local (sin Date.parse de texto ISO, que se interpretaría como UTC y desfasaría un día).
 */
@Injectable()
export class FechaEsAdapter extends NativeDateAdapter {
  override parse(value: any, parseFormat?: any): Date | null {
    if (typeof value !== 'string') {
      return super.parse(value, parseFormat);
    }
    const texto = value.trim();
    if (!texto) return null;
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
    if (!m) return this.invalid();
    const dia = +m[1];
    const mes = +m[2];
    const anio = +m[3];
    const fecha = new Date(anio, mes - 1, dia);
    // Date normaliza 31/02 a marzo: solo vale si los componentes coinciden.
    const coincide = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
    return coincide ? fecha : this.invalid();
  }
}
