import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ListaInstructoresComponent } from './lista-instructores.component';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';

const instructorDummy: InstructorDTO = {
  id: 'INS01',
  nombre: 'Carlos López',
  correo: 'carlos@unicauca.edu.co',
  sexo: 'M',
};

describe('ListaInstructoresComponent', () => {
  let component: ListaInstructoresComponent;
  let fixture: ComponentFixture<ListaInstructoresComponent>;
  let mockInstructorService: jasmine.SpyObj<InstructorServisce>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<any>>;

  beforeEach(async () => {
    mockInstructorService = jasmine.createSpyObj('InstructorServisce', ['getInstructores', 'deleteInstructor']);
    mockInstructorService.getInstructores.and.returnValue(of([instructorDummy]));
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    mockDialogRef.afterClosed.and.returnValue(of(null));
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue(mockDialogRef as any);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [ListaInstructoresComponent, NoopAnimationsModule],
      providers: [
        { provide: InstructorServisce, useValue: mockInstructorService },
        { provide: PerfilService, useValue: { perfil$: of('Coordinador') } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'getProfile', 'isAuthenticated', 'verificarUsuario']) },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaInstructoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit: carga instructores y suscribe perfil$', () => {
    expect(mockInstructorService.getInstructores).toHaveBeenCalled();
    expect(component.instructores.length).toBe(1);
    expect(component.perfil).toBe('Coordinador');
  });

  describe('onDelete', () => {
    let dialogOpenSpy: jasmine.Spy;
    let snackBarOpenSpy: jasmine.Spy;

    beforeEach(() => {
      // spyOn sobre la instancia real inyectada — MatDialogModule standalone crea
      // su propia instancia que no usa el mock del root injector.
      dialogOpenSpy = spyOn(component['dialog'], 'open').and.returnValue(mockDialogRef as any);
      snackBarOpenSpy = spyOn(component['snackBar'], 'open');
    });

    it('abre DialogComponent con tipoElemento="instructor" e instructorId', () => {
      component.onDelete(instructorDummy);
      expect(dialogOpenSpy).toHaveBeenCalledWith(
        jasmine.any(Function),
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            tipoElemento: 'instructor',
            instructorId: 'INS01',
          }),
        })
      );
    });

    it('confirmado: true → recarga instructores y muestra snack-success', () => {
      mockDialogRef.afterClosed.and.returnValue(of({ confirmado: true }));
      component.onDelete(instructorDummy);
      expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(2);
      expect(snackBarOpenSpy).toHaveBeenCalledWith(
        'Instructor eliminado', '',
        jasmine.objectContaining({ panelClass: 'snack-success' })
      );
    });

    it('confirmado: false errorStatus 409 → snack-error con mensaje de ya eliminado', () => {
      mockDialogRef.afterClosed.and.returnValue(of({ confirmado: false, errorStatus: 409 }));
      component.onDelete(instructorDummy);
      expect(snackBarOpenSpy).toHaveBeenCalledWith(
        'El instructor ya se encuentra eliminado', '',
        jasmine.objectContaining({ panelClass: 'snack-error' })
      );
    });

    it('confirmado: false errorStatus 500 → snack-error genérico', () => {
      mockDialogRef.afterClosed.and.returnValue(of({ confirmado: false, errorStatus: 500 }));
      component.onDelete(instructorDummy);
      expect(snackBarOpenSpy).toHaveBeenCalledWith(
        'Error al eliminar el instructor', '',
        jasmine.objectContaining({ panelClass: 'snack-error' })
      );
    });

    it('resultado null → no llama a snackBar ni recarga instructores', () => {
      mockDialogRef.afterClosed.and.returnValue(of(null));
      component.onDelete(instructorDummy);
      expect(snackBarOpenSpy).not.toHaveBeenCalled();
      expect(mockInstructorService.getInstructores).toHaveBeenCalledTimes(1);
    });
  });
});
