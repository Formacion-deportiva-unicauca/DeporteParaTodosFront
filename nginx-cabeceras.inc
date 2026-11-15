# Cabeceras para todas las respuestas. Se incluye en CADA location porque nginx NO hereda los add_header del nivel
# superior cuando una location define los suyos (por ejemplo Cache-Control).
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "SAMEORIGIN" always;

# CSP en modo solo reporte: no bloquea nada, solo avisa en la consola del navegador qué se bloquearía.
# - script-src 'self': el bundle de Angular y los scripts de angular.json (jquery, popper, bootstrap) salen del propio origen.
# - style-src: estilos propios, 'unsafe-inline' (Angular y Material inyectan estilos en línea) y Google Fonts (hoja de estilos).
# - font-src: archivos de las tipografías (Open Sans, Titillium Web, Material Icons) que sirve fonts.gstatic.com.
# - img-src: assets propios y data: (las imágenes de cursos y grupos llegan en base64 desde la API).
# - connect-src: la API (/api/v2, mismo origen) y Google para el login (documento de descubrimiento en accounts.google.com
#   y claves públicas en www.googleapis.com).
# - frame-src: el iframe de renovación silenciosa de angular-oauth2-oidc apunta a accounts.google.com.
add_header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://accounts.google.com https://www.googleapis.com; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self'" always;
