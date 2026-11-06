import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export const URL_POLITICA_DATOS = 'https://www.unicauca.edu.co/wp-content/uploads/2024/08/Politica-de-Tratamiento-de-Datos.pdf';

interface EnlacePie {
  texto: string;
  /** Vacío mientras la dirección no esté definida: se muestra como texto, nunca como enlace roto. */
  url: string;
}

/** Pie institucional (lineamiento UX-UI División TIC): datos de la Universidad, franja de colores del PDI y enlaces legales. */
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css'],
})
export class FooterComponent {
  readonly anio = new Date().getFullYear();
  readonly version = '1.0.0';

  // TODO: completar las direcciones de seguridad de la información y soporte técnico cuando se definan.
  readonly enlaces: EnlacePie[] = [
    { texto: 'Política de Protección de Datos Personales', url: URL_POLITICA_DATOS },
    { texto: 'Política de Seguridad de la Información', url: '' },
    { texto: 'Comunícate con nuestro Soporte Técnico', url: '' },
  ];
}
