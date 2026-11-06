import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { CategoriaService } from 'src/app/services/categoria.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { BreakpointObserver } from '@angular/cdk/layout';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let categoriaServiceSpy: jasmine.SpyObj<CategoriaService>;
  let notificacionesSpy: jasmine.SpyObj<NotificacionService>;
  let tokenReadySubject: Subject<void>;

  beforeEach(async () => {
    tokenReadySubject = new Subject<void>();
    categoriaServiceSpy = jasmine.createSpyObj('CategoriaService', ['getCategorias']);
    categoriaServiceSpy.getCategorias.and.returnValue(of([]));
    notificacionesSpy = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);

    const imagenSpy   = jasmine.createSpyObj('ImagenService', ['getimagen']);
    const dialogSpy   = jasmine.createSpyObj('MatDialog', ['open']);
    const routerSpy   = jasmine.createSpyObj('Router', ['navigate']);
    const perfilStub  = { perfil$: new BehaviorSubject<string>('Coordinador').asObservable() };
    const tokenStub   = { tokenReady$: tokenReadySubject.asObservable() };
    const bpStub      = { observe: () => of({ matches: false, breakpoints: {} }) };

    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        { provide: CategoriaService,        useValue: categoriaServiceSpy },
        { provide: ImagenService,           useValue: imagenSpy },
        { provide: PerfilService,           useValue: perfilStub },
        { provide: TokenInterchangeService, useValue: tokenStub },
        { provide: Router,                  useValue: routerSpy },
        { provide: MatDialog,               useValue: dialogSpy },
        { provide: BreakpointObserver,      useValue: bpStub },
        { provide: NotificacionService,     useValue: notificacionesSpy },
      ],
    })
    .overrideComponent(HomeComponent, {
      set: {
        imports:  [],
        template: '<div></div>',
      },
    })
    .compileComponents();

    fixture   = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => sessionStorage.removeItem('dpt_token'));

  it('debería crearse correctamente', () => {
    sessionStorage.removeItem('dpt_token');
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // ── ngOnInit: rama dpt_token presente (refresh) ──────────────────────────

  it('si dpt_token está en sessionStorage, llama getCategorias() inmediatamente', () => {
    sessionStorage.setItem('dpt_token', 'existing-token');
    fixture.detectChanges();
    expect(categoriaServiceSpy.getCategorias).toHaveBeenCalledTimes(1);
  });

  // ── ngOnInit: rama dpt_token ausente (primer login) ──────────────────────

  it('si dpt_token NO está, no llama getCategorias() en ngOnInit', () => {
    sessionStorage.removeItem('dpt_token');
    fixture.detectChanges();
    expect(categoriaServiceSpy.getCategorias).not.toHaveBeenCalled();
  });

  it('si dpt_token NO está y tokenReady$ emite, llama getCategorias() una vez', () => {
    sessionStorage.removeItem('dpt_token');
    fixture.detectChanges();
    tokenReadySubject.next();
    expect(categoriaServiceSpy.getCategorias).toHaveBeenCalledTimes(1);
  });

  it('take(1): un segundo emit de tokenReady$ no vuelve a llamar getCategorias()', () => {
    sessionStorage.removeItem('dpt_token');
    fixture.detectChanges();
    tokenReadySubject.next();
    tokenReadySubject.next();
    expect(categoriaServiceSpy.getCategorias).toHaveBeenCalledTimes(1);
  });

  // ── loadCategorias: feedback de error ────────────────────────────────────

  it('error HTTP en getCategorias() muestra la notificación de error al usuario', () => {
    sessionStorage.setItem('dpt_token', 'token');
    categoriaServiceSpy.getCategorias.and.returnValue(throwError(() => new Error('500')));
    spyOn(console, 'error');
    fixture.detectChanges();
    expect(notificacionesSpy.error).toHaveBeenCalledOnceWith(
      'No se pudieron cargar las categorías', 'Revise su conexión e intente de nuevo.');
  });
});
