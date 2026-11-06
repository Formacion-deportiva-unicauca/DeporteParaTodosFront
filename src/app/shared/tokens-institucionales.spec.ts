/**
 * Lineamientos UX-UI de la División TIC (v1, abril 2024): los tokens globales y los ajustes sobre Bootstrap/Material
 * deben respetar la paleta, la tipografía y los radios institucionales.
 */
describe('Tokens institucionales (lineamiento UX-UI División TIC)', () => {
  const raiz = () => getComputedStyle(document.documentElement);
  const token = (nombre: string) => raiz().getPropertyValue(nombre).trim().toLowerCase();

  let creados: HTMLElement[] = [];

  function crear(html: string): HTMLElement {
    const contenedor = document.createElement('div');
    contenedor.innerHTML = html;
    const el = contenedor.firstElementChild as HTMLElement;
    document.body.appendChild(contenedor);
    creados.push(contenedor);
    return el;
  }

  afterEach(() => {
    creados.forEach(c => c.remove());
    creados = [];
  });

  describe('paleta', () => {
    const esperados: Record<string, string> = {
      '--color-primario': '#000066',
      '--color-primario-light': '#5056ac',
      '--color-primario-dark': '#07184a',
      '--color-secundario': '#9d0311',
      '--color-secundario-light': '#db141c',
      '--color-secundario-dark': '#690007',
      '--color-terciario': '#1d72d3',
      '--color-tonal-95': '#ecf0ff',
      '--color-error': '#ed7d31',
      '--color-accesibilidad': '#249300',
      '--color-neutro-texto': '#454444',
      '--color-neutro-hover': '#f6f6f6',
    };

    Object.entries(esperados).forEach(([nombre, valor]) => {
      it(`define ${nombre} = ${valor}`, () => {
        expect(token(nombre)).toBe(valor);
      });
    });

    it('el color de error no es rojo: el rojo es institucional', () => {
      expect(token('--color-error')).not.toBe(token('--color-secundario'));
      expect(token('--color-error')).not.toBe(token('--color-secundario-light'));
    });

    // Figura 3/4 del lineamiento (esquema de error claro): Error = naranja oscuro con "On Error" blanco;
    // Error Container = naranja muy claro con "On Error Container" marrón oscuro. El #ED7D31 queda para iconos y texto destacado.
    it('define los roles de error del lineamiento (error, sobre error, contenedor)', () => {
      expect(token('--color-error-texto')).toBe('#9a4100');
      expect(token('--color-sobre-error')).toBe('#ffffff');
      expect(token('--color-error-contenedor')).toBe('#ffdbca');
      expect(token('--color-sobre-error-contenedor')).toBe('#341100');
    });

    it('define los cinco colores del Plan de Desarrollo Institucional', () => {
      ['#ff6c08', '#ffb000', '#5bae40', '#00aae5', '#5a00ba'].forEach((hex, i) => {
        expect(token(`--color-pdi-${i + 1}`)).toBe(hex);
      });
    });
  });

  describe('tipografía y radios', () => {
    it('define Titillium Web para títulos y Open Sans para el cuerpo', () => {
      expect(token('--fuente-titulos')).toContain('titillium web');
      expect(token('--fuente-cuerpo')).toContain('open sans');
    });

    it('define los radios de contenedor del lineamiento', () => {
      expect(token('--radio-campo')).toBe('4px');
      expect(token('--radio-tarjeta')).toBe('12px');
      expect(token('--radio-dialogo')).toBe('28px');
    });

    it('el cuerpo usa Open Sans a 16px como mínimo (Resolución 1519 de 2022)', () => {
      const estilo = getComputedStyle(document.body);
      expect(estilo.fontFamily.toLowerCase()).toContain('open sans');
      expect(parseFloat(estilo.fontSize)).toBeGreaterThanOrEqual(16);
    });

    it('los títulos usan Titillium Web', () => {
      const h2 = crear('<h2>Título</h2>');
      expect(getComputedStyle(h2).fontFamily.toLowerCase()).toContain('titillium web');
    });
  });

  describe('Bootstrap alineado a la paleta', () => {
    it('--bs-primary es el color primario', () => {
      expect(token('--bs-primary')).toBe('#000066');
    });

    it('btn-primary usa el primario y cambia al primario light en hover', () => {
      const boton = crear('<button class="btn btn-primary">Aceptar</button>');
      const estilo = getComputedStyle(boton);
      expect(estilo.backgroundColor).toBe('rgb(0, 0, 102)');
      expect(estilo.getPropertyValue('--bs-btn-hover-bg').trim().toLowerCase()).toBe('#5056ac');
    });

    it('los botones son totalmente redondeados', () => {
      const boton = crear('<button class="btn btn-primary">Aceptar</button>');
      expect(parseFloat(getComputedStyle(boton).borderTopLeftRadius)).toBeGreaterThanOrEqual(100);
    });

    it('los campos de texto tienen 4px de radio', () => {
      const campo = crear('<input class="form-control">');
      expect(getComputedStyle(campo).borderTopLeftRadius).toBe('4px');
    });

    it('btn-danger usa el rol Error (naranja oscuro) con texto blanco, no rojo', () => {
      const boton = crear('<button class="btn btn-danger">Eliminar</button>');
      const estilo = getComputedStyle(boton);
      expect(estilo.backgroundColor).toBe('rgb(154, 65, 0)');
      expect(estilo.color).toBe('rgb(255, 255, 255)');
    });

    it('bg-danger usa el rol Error con texto blanco', () => {
      const insignia = crear('<span class="badge bg-danger">Lleno</span>');
      const estilo = getComputedStyle(insignia);
      expect(estilo.backgroundColor).toBe('rgb(154, 65, 0)');
      expect(estilo.color).toBe('rgb(255, 255, 255)');
    });
  });

  describe('botones en mayúsculas (Button 1 del lineamiento)', () => {
    it('los botones de Bootstrap van en mayúsculas con 1.25px de espaciado', () => {
      const boton = crear('<button class="btn btn-primary">Aceptar</button>');
      const estilo = getComputedStyle(boton);
      expect(estilo.textTransform).toBe('uppercase');
      expect(estilo.letterSpacing).toBe('1.25px');
      expect(estilo.fontSize).toBe('14px');
    });

    it('los botones tienen un objetivo táctil de al menos 44px de alto', () => {
      const boton = crear('<button class="btn btn-primary">Aceptar</button>');
      expect(parseFloat(getComputedStyle(boton).minHeight)).toBeGreaterThanOrEqual(44);
    });

    it('los botones de Material van en mayúsculas', () => {
      const boton = crear('<button class="mat-mdc-button mat-mdc-unelevated-button">Aceptar</button>');
      expect(getComputedStyle(boton).textTransform).toBe('uppercase');
    });
  });

  describe('snackbars', () => {
    function superficie(clase: string): CSSStyleDeclaration {
      const el = crear(`<div class="${clase}"><div class="mdc-snackbar__surface"></div></div>`);
      return getComputedStyle(el.querySelector('.mdc-snackbar__surface') as HTMLElement);
    }

    it('snack-success usa el verde de accesibilidad', () => {
      expect(superficie('snack-success').backgroundColor).toBe('rgb(36, 147, 0)');
    });

    it('snack-error usa el rol Error (naranja oscuro) con texto blanco', () => {
      const estilo = superficie('snack-error');
      expect(estilo.backgroundColor).toBe('rgb(154, 65, 0)');
      expect(estilo.color).toBe('rgb(255, 255, 255)');
    });
  });

  describe('diálogos y formularios (hoja compartida)', () => {
    it('Aceptar/Guardar/Confirmar: relleno primario con texto blanco y forma de píldora', () => {
      for (const clase of ['aceptar', 'btn-guardar', 'btn-confirmar']) {
        const boton = crear(`<button class="${clase}">Guardar</button>`);
        const estilo = getComputedStyle(boton);
        expect(estilo.backgroundColor).withContext(clase).toBe('rgb(0, 0, 102)');
        expect(estilo.color).withContext(clase).toBe('rgb(255, 255, 255)');
        expect(parseFloat(estilo.borderTopLeftRadius)).withContext(clase).toBeGreaterThanOrEqual(100);
      }
    });

    it('Cancelar/Volver: contorno primario sin relleno, distinguible del botón principal', () => {
      for (const clase of ['cancelar', 'btn-cancelar', 'btn-volver']) {
        const boton = crear(`<button class="${clase}">Cancelar</button>`);
        const estilo = getComputedStyle(boton);
        expect(estilo.backgroundColor).withContext(clase).toBe('rgba(0, 0, 0, 0)');
        expect(estilo.color).withContext(clase).toBe('rgb(0, 0, 102)');
        expect(estilo.borderTopColor).withContext(clase).toBe('rgb(0, 0, 102)');
        expect(parseFloat(estilo.borderTopWidth)).withContext(clase).toBeGreaterThanOrEqual(2);
      }
    });

    it('Eliminar usa el rol Error (naranja oscuro), nunca rojo', () => {
      const boton = crear('<button class="btn-eliminar">Eliminar</button>');
      const estilo = getComputedStyle(boton);
      expect(estilo.backgroundColor).toBe('rgb(154, 65, 0)');
      expect(estilo.color).toBe('rgb(255, 255, 255)');
    });

    it('los botones de acción tienen objetivo táctil de 44px', () => {
      const boton = crear('<button class="aceptar">Guardar</button>');
      expect(parseFloat(getComputedStyle(boton).minHeight)).toBeGreaterThanOrEqual(44);
    });

    it('.form-buttons alinea las acciones a la derecha', () => {
      const fila = crear('<div class="form-buttons"><button>a</button></div>');
      const estilo = getComputedStyle(fila);
      expect(estilo.display).toBe('flex');
      expect(estilo.justifyContent).toBe('flex-end');
    });

    it('los mensajes de error del servidor usan el contenedor de error (naranja), no rojo', () => {
      for (const clase of ['error-servidor', 'error-vigentes']) {
        const aviso = crear(`<p class="${clase}">Error</p>`);
        const estilo = getComputedStyle(aviso);
        expect(estilo.backgroundColor).withContext(clase).toBe('rgb(255, 219, 202)');
        expect(estilo.color).withContext(clase).toBe('rgb(52, 17, 0)');
      }
    });

    it('el título del diálogo va a la izquierda en Titillium Web, con espacio para el botón de cerrar', () => {
      const dialogo = crear('<div class="dialog-content"><header class="title-two">Registrar curso</header></div>');
      const titulo = dialogo.querySelector('.title-two') as HTMLElement;
      const estilo = getComputedStyle(titulo);
      expect(estilo.textAlign).toBe('left');
      expect(estilo.fontFamily.toLowerCase()).toContain('titillium web');
      expect(estilo.color).toBe('rgb(0, 0, 102)');
      expect(parseFloat(estilo.marginRight)).toBeGreaterThanOrEqual(40);
    });

    it('el botón de cerrar se coloca en la esquina superior derecha del diálogo', () => {
      const cerrar = crear('<button class="close-button" aria-label="Cerrar diálogo">x</button>');
      const estilo = getComputedStyle(cerrar);
      expect(estilo.position).toBe('absolute');
      expect(parseFloat(estilo.minWidth || estilo.width)).toBeGreaterThanOrEqual(44);
    });

    it('el selector de imagen oculta el input nativo y muestra un botón de contorno accesible', () => {
      const selector = crear(
        '<div class="selector-imagen"><input type="file" id="img" class="archivo-oculto">' +
        '<label for="img" class="boton-archivo">Seleccionar imagen</label></div>');
      const entrada = selector.querySelector('input') as HTMLElement;
      const etiqueta = selector.querySelector('label') as HTMLElement;
      expect(getComputedStyle(entrada).opacity).toBe('0');
      expect(getComputedStyle(etiqueta).borderTopColor).toBe('rgb(0, 0, 102)');
      expect(parseFloat(getComputedStyle(etiqueta).minHeight)).toBeGreaterThanOrEqual(44);
    });
  });

  describe('diálogo con cabecera, cuerpo y pie (diseño del prototipo)', () => {
    it('la cabecera separa el título del cuerpo con una línea y deja sitio al botón de cerrar', () => {
      const cabecera = crear('<header class="dlg-cabecera"><div>t</div></header>');
      const estilo = getComputedStyle(cabecera);
      expect(estilo.display).toBe('flex');
      expect(estilo.justifyContent).toBe('space-between');
      expect(parseFloat(estilo.borderBottomWidth)).toBe(1);
    });

    it('la etiqueta superior va en mayúsculas pequeñas con espaciado, como en el prototipo', () => {
      const etiqueta = crear('<span class="dlg-eyebrow">Gestión de grupos</span>');
      const estilo = getComputedStyle(etiqueta);
      expect(estilo.textTransform).toBe('uppercase');
      expect(estilo.fontSize).toBe('12px');
      expect(estilo.letterSpacing).toBe('1.5px');
    });

    it('el título del diálogo usa Titillium Web, 24px, azul primario', () => {
      const titulo = crear('<h2 class="dlg-titulo">Editar grupo</h2>');
      const estilo = getComputedStyle(titulo);
      expect(estilo.fontFamily.toLowerCase()).toContain('titillium web');
      expect(estilo.fontSize).toBe('24px');
      expect(estilo.color).toBe('rgb(0, 0, 102)');
    });

    it('el botón de cerrar de la cabecera es un círculo con contorno (no flota sobre el título)', () => {
      const cabecera = crear('<header class="dlg-cabecera"><div>t</div><button class="close-button">x</button></header>');
      const cerrar = cabecera.querySelector('.close-button') as HTMLElement;
      const estilo = getComputedStyle(cerrar);
      expect(estilo.position).toBe('relative');
      expect(parseFloat(estilo.borderTopLeftRadius)).toBeGreaterThanOrEqual(22);
      expect(parseFloat(estilo.borderTopWidth)).toBe(1);
    });

    it('el pie separa las acciones con una línea y las alinea a la derecha', () => {
      const pie = crear('<div class="dlg-pie"><button>a</button></div>');
      const estilo = getComputedStyle(pie);
      expect(estilo.justifyContent).toBe('flex-end');
      expect(parseFloat(estilo.borderTopWidth)).toBe(1);
    });

    it('las secciones numeradas llevan un círculo azul con el número del paso', () => {
      const paso = crear('<span class="dlg-paso">1</span>');
      const estilo = getComputedStyle(paso);
      expect(estilo.backgroundColor).toBe('rgb(0, 0, 102)');
      expect(estilo.color).toBe('rgb(255, 255, 255)');
      expect(parseFloat(estilo.borderTopLeftRadius)).toBeGreaterThanOrEqual(14);
      expect(estilo.width).toBe('28px');
    });

    it('el aviso informativo usa el tonal 95 con borde terciario a la izquierda', () => {
      const aviso = crear('<div class="dlg-aviso">Los campos marcados con * son obligatorios.</div>');
      const estilo = getComputedStyle(aviso);
      expect(estilo.backgroundColor).toBe('rgb(236, 240, 255)');
      expect(estilo.borderLeftColor).toBe('rgb(29, 114, 211)');
    });

    it('la rejilla de campos pasa a una columna en pantallas estrechas (auto-fit)', () => {
      const rejilla = crear('<div class="dlg-rejilla"><div>a</div><div>b</div></div>');
      expect(getComputedStyle(rejilla).display).toBe('grid');
    });

    it('la tarjeta de contexto muestra datos de solo lectura sobre fondo gris claro', () => {
      const tarjeta = crear('<div class="dlg-contexto"><dl><dt>Categoría</dt><dd>Recreativo</dd></dl></div>');
      const estilo = getComputedStyle(tarjeta);
      expect(estilo.backgroundColor).toBe('rgb(246, 246, 246)');
      expect(parseFloat(estilo.borderTopLeftRadius)).toBe(8);
    });

    it('la zona de imagen es un recuadro de borde punteado, como en el prototipo', () => {
      const zona = crear('<div class="selector-imagen"><label class="boton-archivo">x</label></div>');
      expect(getComputedStyle(zona).borderTopStyle).toBe('dashed');
    });
  });
});
