import { Component, Input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

/**
 * Marcador de posición mientras llegan los datos. Se coloca dentro de la rejilla o lista que va a llenarse: el
 * elemento no genera caja propia (display: contents), así que las tarjetas esqueleto ocupan las mismas celdas.
 * - tarjeta: tarjeta con imagen, título, texto y botón.
 * - fila: fila de una lista o tabla.
 * - imagen: un solo bloque que llena su contenedor (para la imagen que aún no llega).
 * Los bloques son decorativos (aria-hidden); un texto oculto anuncia "Cargando…" a los lectores de pantalla.
 */
@Component({
  selector: 'app-esqueleto',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <span class="solo-lectores" role="status">{{ etiqueta }}</span>
    <ng-container *ngFor="let _ of elementos">
      <div *ngIf="forma === 'tarjeta'" class="esq-tarjeta" aria-hidden="true">
        <div class="esq-imagen esq-brillo"></div>
        <div class="esq-cuerpo">
          <div class="esq-linea esq-titulo esq-brillo"></div>
          <div class="esq-linea esq-brillo"></div>
          <div class="esq-linea esq-corta esq-brillo"></div>
          <div class="esq-boton esq-brillo"></div>
        </div>
      </div>
      <div *ngIf="forma === 'fila'" class="esq-fila" aria-hidden="true">
        <div class="esq-linea esq-brillo"></div>
        <div class="esq-linea esq-media esq-brillo"></div>
        <div class="esq-linea esq-corta esq-brillo"></div>
      </div>
      <div *ngIf="forma === 'imagen'" class="esq-imagen-completa esq-brillo" aria-hidden="true"></div>
    </ng-container>
  `,
  styles: [`
    :host { display: contents; }
    .solo-lectores {
      position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
    .esq-brillo {
      background: linear-gradient(90deg, #e6e8ee 25%, #f3f4f8 37%, #e6e8ee 63%);
      background-size: 400% 100%;
      animation: esq-brillo 1.4s ease infinite;
    }
    @keyframes esq-brillo { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    @media (prefers-reduced-motion: reduce) { .esq-brillo { animation: none; background: #e6e8ee; } }

    .esq-tarjeta {
      display: flex; flex-direction: column; overflow: hidden; border-radius: var(--radio-tarjeta, 12px);
      background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    }
    .esq-imagen { height: 180px; }
    .esq-cuerpo { display: flex; flex-direction: column; gap: 0.6rem; padding: 1rem; }
    .esq-linea { height: 14px; border-radius: 7px; }
    .esq-titulo { width: 60%; height: 20px; }
    .esq-media { width: 75%; }
    .esq-corta { width: 40%; }
    .esq-boton { width: 120px; height: 36px; margin-top: 0.4rem; border-radius: 18px; }
    .esq-fila {
      display: flex; flex-direction: column; gap: 0.5rem; padding: 0.9rem 1rem;
      border-bottom: 1px solid #ececf0; background: #fff;
    }
    .esq-imagen-completa { width: 100%; height: 100%; min-height: 160px; }
  `],
})
export class EsqueletoComponent {
  @Input() forma: 'tarjeta' | 'fila' | 'imagen' = 'tarjeta';
  @Input() cantidad = 3;
  @Input() etiqueta = 'Cargando…';

  get elementos(): number[] {
    return Array.from({ length: Math.max(0, Math.floor(this.cantidad)) }, (_, i) => i);
  }
}
