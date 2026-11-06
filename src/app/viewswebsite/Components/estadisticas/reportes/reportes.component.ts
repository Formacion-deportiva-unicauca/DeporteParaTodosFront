import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Observable } from 'rxjs';
import { SidenavComponent } from "../../../pages/sidenav/sidenav.component";
import { ReportesService } from 'src/app/services/reportes.service';
import { Router } from '@angular/router';
import { CategoriaService } from 'src/app/services/categoria.service';
import { CategoriaDTO } from 'src/app/Models/DTOs/categoria-dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { EstadisticasDTO } from 'src/app/Models/DTOs/estadisticas-dto';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';
import { GrupoService } from 'src/app/services/grupo.service';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatIconModule,
    MatFormFieldModule,
    NgxChartsModule,
    MatSelectModule,
    SidenavComponent,
    MatNativeDateModule,
    MatDatepickerModule,
    MatPaginatorModule,
    MatSortModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatTableModule,
    MatSnackBarModule
  ],

  providers: [
    MatNativeDateModule,
    MatDatepickerModule,
    DatePipe,
  ],

  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css'],
})
export class ReportesComponent implements OnInit {
  filtros!: FormGroup;
  dataSource = new MatTableDataSource<EstadisticasDTO>();
  displayedColumns: string[] = ['Nombre', 'clases', 'duracion'];
  chartData: { name: string; value: number }[] = [];
  selectedTabIndex = 0;

  @ViewChild('exportChart', { static: false }) exportChartRef!: ElementRef;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  categorias: CategoriaDTO[] = [];
  cursos: CursoDTO[] = [];
  grupos: GrupoDTO[] = [];
  fechaActual: Date = new Date();

  dtoEstadisticas: EstadisticasDTO = {
    leyenda1: '',
    leyenda2: '',
    leyenda3: '',
    leyenda4: '',
    clases: 0,
    horas: 0,
    minutos: 0,
    duracion: 0,
  }

  columnLabels: { [key: string]: string } = {
    nombre: 'Nombre',
    leyenda1: 'Categoría',
    leyenda2: 'Curso',
    leyenda3: 'Grupo',
    clases: 'Clases',
    duracion: 'Duración (h)'
  };

  constructor(
    private fb: FormBuilder,
    private repotesService: ReportesService,
    private categoriaService: CategoriaService,
    private cursosService: CursodeportivoService,
    private grupoService: GrupoService,
    private router: Router,
    private datepipe: DatePipe,
    private notificaciones: NotificacionService,
  ) { }


  ngOnInit(): void {
    this.initForm();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.cargarCategorias();
    this.filtros.get('categoria')?.valueChanges.subscribe(categoria => {
      if (categoria) {
        this.cursosService.getCursos(categoria).subscribe(
          (response) => {
            this.cursos = response;
            this.filtros.get('curso')?.reset();
            this.grupos = [];
            this.filtros.get('grupo')?.reset();
          },
          (error) => {
            console.error('Error cargando cursos por categoría', error);
            this.cursos = [];
          }
        );
      } else {
        this.cursos = [];
        this.grupos = [];
        this.filtros.get('curso')?.reset();
        this.filtros.get('grupo')?.reset();
      }
    });

    // Escuchar cambios de curso
    this.filtros.get('curso')?.valueChanges.subscribe(curso => {
      const categoria = this.filtros.get('categoria')?.value;

      if (categoria && curso) {
        this.grupoService.getGrupos(categoria, curso).subscribe(
          (response) => {
            this.grupos = response;
            this.filtros.get('grupo')?.reset();
          },
          (error) => {
            console.error('Error cargando grupos', error);
            this.grupos = [];
          }
        );
      } else {
        this.grupos = [];
        this.filtros.get('grupo')?.reset();
      }
    });

  }

  private initForm() {
    this.filtros = this.fb.group({
      inicio: [this.datepipe.transform(new Date(), 'yyyy-MM-dd'), Validators.required],
      fin: [this.datepipe.transform(new Date(), 'yyyy-MM-dd'), Validators.required],
      categoria: [''],
      curso: [''],
      grupo: [''],
      anio: [null],
      iterable: [null],
      alumno: [''],
      instructor: ['']
    });
  }

  cargarCategorias(): void {
    this.categoriaService.getCategorias().subscribe(
      (categoriasTemp) => {
        this.categorias = categoriasTemp;
      }
    );
  }

  cargarCursos(): void {
    this.cursosService.getAllCursos().subscribe(
      (response) => {
        this.cursos = response;
      }
    );
  }

  cargarGrupos(): void {
    this.grupoService.getGrupos('Categoría 1', 'Curso02').subscribe(
      (response) => {
        this.grupos = response;
      }
    );
  }

  letraDeIterable(n: number | null): string {
    if (!n || n < 1) return '?';
    return String.fromCharCode(64 + n);
  }

  generarReporte() {
    const { inicio, fin, categoria, curso, anio, iterable, alumno, instructor } = this.filtros.value;

    const fechaInicioForamteada: string = this.FormatDate(inicio);
    const fechaFinFormateada: string = this.FormatDate(fin);

    let obs$: Observable<EstadisticasDTO[]>;
    if (categoria && !curso && !anio && !iterable && !alumno && !instructor) {
      obs$ = this.repotesService.getEstadisticasCategoria(fechaInicioForamteada, fechaFinFormateada, categoria);
      this.displayedColumns = ['leyenda1', 'clases', 'duracion'];
    } else
      if (categoria && curso && !anio && !iterable && !alumno && !instructor) {
        obs$ = this.repotesService.getEstadisticasCursos(fechaInicioForamteada, fechaFinFormateada, categoria, curso);
        this.displayedColumns = ['leyenda1', 'leyenda2', 'clases', 'duracion'];
      } else
        if (categoria && curso && anio && iterable && !alumno && !instructor) {
          obs$ = this.repotesService.getEstadisticasGrupos(fechaInicioForamteada, fechaFinFormateada, categoria, curso, anio, iterable);
          this.displayedColumns = ['leyenda1', 'leyenda2', 'leyenda3', 'clases', 'duracion'];
        } else
          if (!categoria && !curso && !anio && !iterable && alumno && !instructor) {
            obs$ = this.repotesService.getEstadisticasAlumno(fechaInicioForamteada, fechaFinFormateada, alumno);
            this.displayedColumns = ['nombre', 'clases', 'duracion'];
          } else
            if (!categoria && !curso && !anio && !iterable && !alumno && instructor) {
              obs$ = this.repotesService.getEstadisticasInstructore(fechaInicioForamteada, fechaFinFormateada, instructor);
              this.displayedColumns = ['nombre', 'clases', 'duracion'];
            } else {
              this.notificaciones.error('Filtros incompletos', 'Diligencie el formulario e intente nuevamente.');
              return;
            }
    obs$.subscribe(datos => {
      this.dataSource.data = datos;
      this.chartData = datos.map(d => ({
        name: d.leyenda1,
        value: d.clases
      }));
    });
  }

  limpiarFiltros() {
    const hoy = new Date();
    this.filtros.reset({
      inicio: hoy,
      fin: hoy,
      categoria: '',
      curso: '',
      grupo: '',
      alumno: '',
      instructor: ''
    });
  }

  private FormatDate(fecha: Date): string {
    return this.datepipe.transform(fecha, 'yyyy-MM-dd')!;
  }

  validarFechaCreacion = (fecha: Date | null): boolean => {
    return !fecha || fecha <= this.fechaActual;
  }

  validarFechaCierre = (fecha: Date | null): boolean => {
    return !fecha || fecha >= this.fechaActual;
  }

  async exportarPDF() {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const fecha = this.datepipe.transform(new Date(), 'dd/MM/yyyy HH:mm') || '';
      doc.setFontSize(16);
      doc.text('Reporte del programa Formación deportiva', 14, 20);
      doc.setFontSize(10);
      doc.text(`Fecha: ${fecha}`, 14, 28);

      //Exportar la tabla con autoTable
      const header = this.displayedColumns.map(c => this.columnLabels[c] || c);
      const body = (this.dataSource.data || []).map((row: any) =>
        this.displayedColumns.map(col => (row && row[col] !== undefined && row[col] !== null) ? String(row[col]) : '')
      );

      autoTable(doc, {
        head: [header],
        body,
        startY: 35,
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      // Generación de gráfica
      doc.addPage();
      doc.text('Gráfica del reporte', 14, 20);
      const exportContainer: HTMLElement | null = this.exportChartRef ? this.exportChartRef.nativeElement : null;

      let imgData: string | null = null;
      if (exportContainer) {
        const svgEl = exportContainer.querySelector<SVGElement>('svg');
        if (svgEl) {
          try {
            imgData = await this.svgToPngDataUrl(svgEl, 900, 400);
          } catch (err) {
            console.warn('Error al generar el gráfico del reporte', err);
          }
        }
        if (!imgData) {
          const canvas = await html2canvas(exportContainer, { backgroundColor: '#ffffff', useCORS: true, scale: 2 });
          imgData = canvas.toDataURL('image/png');
        }
      }

      if (imgData) {
        const pdfWidth = doc.internal.pageSize.getWidth() - 28;
        const props = (doc as any).getImageProperties(imgData);
        const pdfHeight = (props.height * pdfWidth) / props.width;
        doc.addImage(imgData, 'PNG', 14, 30, pdfWidth, pdfHeight);
      } else {
        this.notificaciones.info('Reporte sin gráfica', 'No se encontró una gráfica para incluir en el PDF.');
      }

      doc.save('Formacion deportica.pdf');
    } catch (err) {
      console.error('Error exportando PDF:', err);
      this.notificaciones.error('No se pudo generar el PDF', 'Intente de nuevo.');
    }
  }

  // método para cabecera del reporte
  private toTitleCase(s: string): string {
    return String(s).replace(/[_\-]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  }

  private svgToPngDataUrl(svg: SVGElement, forcedWidth?: number, forcedHeight?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const clone = svg.cloneNode(true) as SVGElement;
        // inlinear estilos: mapear elementos originales y clonado
        const origElems = Array.from(svg.querySelectorAll<HTMLElement>('*'));
        const cloneElems = Array.from(clone.querySelectorAll<HTMLElement>('*'));
        origElems.forEach((origEl, i) => {
          const computed = window.getComputedStyle(origEl);
          let cssText = computed.cssText;
          if (!cssText) {
            cssText = Array.from(computed).reduce((acc, prop) => acc + `${prop}:${computed.getPropertyValue(prop)};`, '');
          }
          if (cloneElems[i]) cloneElems[i].setAttribute('style', cssText);
        });
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const bbox = svg.getBoundingClientRect();
        const widthAttr = svg.getAttribute('width');
        const heightAttr = svg.getAttribute('height');
        const w = forcedWidth || (widthAttr ? parseFloat(widthAttr) : bbox.width || 900);
        const h = forcedHeight || (heightAttr ? parseFloat(heightAttr) : bbox.height || 400);
        clone.setAttribute('width', String(w));
        clone.setAttribute('height', String(h));

        const serialized = new XMLSerializer().serializeToString(clone);
        const svgBase64 = btoa(unescape(encodeURIComponent(serialized)));
        const imgSrc = 'data:image/svg+xml;base64,' + svgBase64;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject('No se pudo obtener el gráfico.');
            return;
          }
          ctx.fillStyle = '#ffffff'; //fondo del reporte
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => {
          reject(e);
        };
        img.src = imgSrc;
      } catch (err) {
        reject(err);
      }
    });
  }
}



