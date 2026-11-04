import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { MatFormField } from '@angular/material/form-field';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { FormCursoDeportiviComponent } from './form-curso-deportivi.component';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { DeporteService } from 'src/app/services/deporte.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';

describe('FormCursoDeportiviComponent › público del curso', () => {
  let fixture: ComponentFixture<FormCursoDeportiviComponent>;
  let component: FormCursoDeportiviComponent;
  let cursoSpy: jasmine.SpyObj<CursodeportivoService>;
  let imagenSpy: jasmine.SpyObj<ImagenService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<FormCursoDeportiviComponent>>;

  async function montar(data: { tituloCategoria: string; nombrecurso: string }, cursoExistente?: Partial<CursoDTO>) {
    cursoSpy = jasmine.createSpyObj('CursodeportivoService', ['crearCurso', 'updateCurso', 'getCurso']);
    imagenSpy = jasmine.createSpyObj('ImagenService', ['postImagen', 'getimagen']);
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const deporteSpy = jasmine.createSpyObj('DeporteService', ['getDeportes', 'crearDeporte']);
    deporteSpy.getDeportes.and.returnValue(of([{ nombre: 'Natacion' }]));
    cursoSpy.crearCurso.and.returnValue(of({} as CursoDTO));
    cursoSpy.updateCurso.and.returnValue(of({} as CursoDTO));
    imagenSpy.postImagen.and.returnValue(of({ id: 77 } as any));
    if (cursoExistente) {
      cursoSpy.getCurso.and.returnValue(of({
        nombre: 'Natacion avanzada', deporte: 'Natacion', categoriaCurso: 'Recreativo', descripcion: 'Desc',
        idImagen: null, estadoInscripciones: 'ABIERTO', ...cursoExistente,
      } as CursoDTO));
    }

    await TestBed.configureTestingModule({
      imports: [FormCursoDeportiviComponent, NoopAnimationsModule],
      providers: [
        { provide: CursodeportivoService, useValue: cursoSpy },
        { provide: DeporteService, useValue: deporteSpy },
        { provide: ImagenService, useValue: imagenSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCursoDeportiviComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function llenar(): void {
    Object.assign(component.curso, { nombre: 'Natacion basica', deporte: 'Natacion', descripcion: 'Curso de prueba' });
  }

  const etiquetas = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('mat-label') as NodeListOf<HTMLElement>)
      .map(e => (e.textContent ?? '').trim());

  describe('al crear', () => {
    beforeEach(async () => montar({ tituloCategoria: 'Recreativo', nombrecurso: '' }));

    it('el campo del deporte se llama "Línea deportiva"', () => {
      expect(etiquetas()).toContain('Línea deportiva');
      expect(etiquetas()).not.toContain('Deporte');
    });

    it('pide "Dirigido a", con toda la comunidad por defecto', () => {
      expect(etiquetas()).toContain('Dirigido a');
      expect(fixture.nativeElement.querySelector('mat-select[name="publico"]')).not.toBeNull();
      expect(component.curso.publico).toBe('MIXTO');
    });

    it('ofrece los tres públicos', () => {
      expect(component.publicos.map(p => p.valor)).toEqual(['MIXTO', 'ESTUDIANTE', 'FUNCIONARIO']);
    });

    it('envía el público elegido al crear un curso sin imagen', () => {
      llenar();
      component.curso.publico = 'FUNCIONARIO';

      component.onSubmit({} as NgForm);

      expect(cursoSpy.crearCurso.calls.mostRecent().args[0].publico).toBe('FUNCIONARIO');
    });

    it('envía el público elegido al crear un curso con imagen', () => {
      llenar();
      component.curso.publico = 'ESTUDIANTE';
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });

      component.onSubmit({} as NgForm);

      expect(imagenSpy.postImagen).toHaveBeenCalled();
      const enviado = cursoSpy.crearCurso.calls.mostRecent().args[0];
      expect(enviado.publico).toBe('ESTUDIANTE');
      expect(enviado.idImagen).toBe(77);
    });

    it('si no se toca el público, se crea para toda la comunidad', () => {
      llenar();

      component.onSubmit({} as NgForm);

      expect(cursoSpy.crearCurso.calls.mostRecent().args[0].publico).toBe('MIXTO');
    });

    // Fase 3: el estado de inscripciones del curso se deriva de sus grupos; no se elige en el formulario.
    it('no pide "Estado de inscripciones": se calcula a partir de los grupos', () => {
      expect(etiquetas()).not.toContain('Estado de inscripciones');
      expect(fixture.nativeElement.querySelector('mat-select[name="estadoInscripciones"]')).toBeNull();
    });

    it('no envía estadoInscripciones al crear (con y sin imagen)', () => {
      llenar();
      component.onSubmit({} as NgForm);
      expect('estadoInscripciones' in cursoSpy.crearCurso.calls.mostRecent().args[0]).toBeFalse();
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });
      component.onSubmit({} as NgForm);
      expect('estadoInscripciones' in cursoSpy.crearCurso.calls.mostRecent().args[0]).toBeFalse();
    });

    it('no pide el horario del curso: el horario se define en cada grupo', () => {
      expect(fixture.nativeElement.querySelector('input[name="horario"]')).toBeNull();
      expect(etiquetas()).not.toContain('Horario');
    });

    it('la ayuda de "Dirigido a" crece con su texto para no encimarse con el campo siguiente', () => {
      const campo = fixture.debugElement.queryAll(By.directive(MatFormField))
        .find(d => d.nativeElement.querySelector('mat-select[name="publico"]'));
      expect(campo).toBeDefined();
      expect((campo!.componentInstance as MatFormField).subscriptSizing).toBe('dynamic');
    });

    it('no envía horario al crear un curso sin imagen', () => {
      llenar();
      component.onSubmit({} as NgForm);
      expect('horario' in cursoSpy.crearCurso.calls.mostRecent().args[0]).toBeFalse();
    });

    it('no envía horario al crear un curso con imagen', () => {
      llenar();
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });
      component.onSubmit({} as NgForm);
      expect('horario' in cursoSpy.crearCurso.calls.mostRecent().args[0]).toBeFalse();
    });
  });

  describe('al editar', () => {
    it('carga el público guardado y lo envía al actualizar sin imagen', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { publico: 'ESTUDIANTE' });
      expect(component.curso.publico).toBe('ESTUDIANTE');

      component.curso.publico = 'FUNCIONARIO';
      component.onSubmit({} as NgForm);

      const [categoria, nombre, enviado] = cursoSpy.updateCurso.calls.mostRecent().args;
      expect(categoria).toBe('Recreativo');
      expect(nombre).toBe('Natacion avanzada');
      expect(enviado.publico).toBe('FUNCIONARIO');
    });

    it('envía el público al actualizar con una imagen nueva', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { publico: 'FUNCIONARIO' });
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });

      component.onSubmit({} as NgForm);

      const enviado = cursoSpy.updateCurso.calls.mostRecent().args[2];
      expect(enviado.publico).toBe('FUNCIONARIO');
      expect(enviado.idImagen).toBe(77);
    });

    it('un curso que llega sin público (backend anterior) se edita como toda la comunidad', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { publico: undefined });

      expect(component.curso.publico).toBe('MIXTO');
    });

    it('no envía estadoInscripciones al actualizar, aunque el curso lo traiga derivado', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { estadoInscripciones: 'CERRADO' });
      component.onSubmit({} as NgForm);
      expect('estadoInscripciones' in cursoSpy.updateCurso.calls.mostRecent().args[2]).toBeFalse();
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });
      component.onSubmit({} as NgForm);
      expect('estadoInscripciones' in cursoSpy.updateCurso.calls.mostRecent().args[2]).toBeFalse();
    });

    it('no envía horario al actualizar, aunque el curso lo traiga', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { horario: 'Lunes 8 a 10' });
      component.onSubmit({} as NgForm);
      expect('horario' in cursoSpy.updateCurso.calls.mostRecent().args[2]).toBeFalse();
    });

    it('no envía horario al actualizar con una imagen nueva', async () => {
      await montar({ tituloCategoria: 'Recreativo', nombrecurso: 'Natacion avanzada' }, { horario: 'Lunes 8 a 10' });
      component.selectedFile = new File(['x'], 'foto.png', { type: 'image/png' });
      component.onSubmit({} as NgForm);
      expect('horario' in cursoSpy.updateCurso.calls.mostRecent().args[2]).toBeFalse();
    });
  });
});
