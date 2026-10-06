import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DialogComponent } from '../../dialog/dialog.component';

@Component({
  selector: 'app-config-tipo-curso',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatSnackBarModule],
  templateUrl: './config-tipo-curso.component.html',
  styleUrls: ['./config-tipo-curso.component.css']
})
export class ConfigTipoCursoComponent {
  menuVisible = false;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  toggleMenu() {
    this.menuVisible = !this.menuVisible;
  }

  edit() {
    alert('Editar seleccionado');
    this.menuVisible = false;
  }

  delete(titulo: string) {
    this.menuVisible = false;
    const dialogRef = this.dialog.open(DialogComponent, {
      data: { elemento: ' la categoría', nombreElemento: titulo, tipoElemento: 'categoria' },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        void this.router.navigate(['/home']);
      } else if (result?.errorStatus !== undefined) {
        const status = result.errorStatus;
        if (status === 409) {
          this.snackBar.open('La categoría ya se encuentra eliminada', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
        } else if (status === 404) {
          this.snackBar.open('La categoría no existe', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
        } else {
          this.snackBar.open('Error al eliminar la categoría, intente de nuevo', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
        }
      }
    });
  }

  clickOutside(event: Event) {
    if (!(event.target as HTMLElement).closest('.config-button, .menu')) {
      this.menuVisible = false;
    }
  }
}
