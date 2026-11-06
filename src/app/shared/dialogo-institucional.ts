import { MatDialogConfig } from '@angular/material/dialog';

/**
 * Opciones por defecto de todos los diálogos de la app (se registran con MAT_DIALOG_DEFAULT_OPTIONS en AppModule).
 * La clase "dialogo-institucional" permite que la hoja de estilos (src/styles/formularios.css) haga que en móvil el
 * diálogo ocupe todo el ancho: el panel del overlay de Material no trae una clase propia con la que seleccionarlo.
 */
export const OPCIONES_DIALOGO: MatDialogConfig = {
  panelClass: 'dialogo-institucional',
  maxWidth: '90vw',
};
