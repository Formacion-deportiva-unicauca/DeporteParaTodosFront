# Graph Report - DeporteParaTodosFront  (2026-09-22)

## Corpus Check
- 144 files · ~47,247 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1138 nodes · 3210 edges · 76 communities (50 shown, 26 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 181 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Cursos Deportivos Core
- Categoria y Estadísticas
- Deporte e Imagen
- Login y Roles
- Alumno y Perfil
- Dependencias NPM A
- Auth Service
- Escenario y Horario
- CI y Documentación
- Cursos Deportivos Ops
- Categoria Service
- Dependencias NPM B
- Inscripcion y Disponibilidad
- Horario Service
- Dialogs y Notificaciones
- Grupo Service
- Perfil Service
- Reportes Service
- Asistencia y Clase
- Instructor Service
- Deporte Ops
- Instructor Display
- Routing e InfoCurso
- Auth Service B
- DevDependencias
- Auth Interceptor
- Alerta Service
- ListDeportistas
- Routing Estudiante
- Alumno Service
- Form Grupos
- Reportes Component
- E2E Tests
- Grupo Service B
- Imagen Cursos
- Header Component
- ListGrupos
- Home y Sidenav
- ListDeportistas B
- Angular Config
- Inscripciones Service
- Escenario Service
- Home Component
- App Module
- Form Inscripciones
- Build Config
- Dev Config
- Atencion Asistencia
- Clase Service
- InfoCurso Component
- Package Scripts
- Angular Workspace
- Angular Test Config
- ConfigTipoCurso A
- InscripcionGrupo
- ConfigTipoCurso B
- Project Config
- Login Component A
- Login Component B
- Form Alerta
- InfoEstudiante
- Build Config B
- Bootstrap AppModule
- README Docs
- Config Template
- Alert Image
- CatDeportes Image
- Deporte Image
- Deportes Image
- Logo Unicauca2
- Logo Unicauca
- Logo Unicauca H
- Logo Unicauca V
- Portada Image
- Silueta Image

## God Nodes (most connected - your core abstractions)
1. `@angular/core` - 101 edges
2. `rxjs` - 65 edges
3. `@angular/common` - 51 edges
4. `@angular/router` - 49 edges
5. `PerfilService` - 40 edges
6. `PerfilService` - 36 edges
7. `CursodeportivoService` - 28 edges
8. `@angular/forms` - 27 edges
9. `CursoDTO` - 27 edges
10. `GrupoService` - 27 edges

## Surprising Connections (you probably didn't know these)
- `AuthService` --wraps--> `Google OAuth2 angular-oauth2-oidc`  [EXTRACTED]
  src/app/services/auth.service.ts → AGENTS.md
- `PerfilService` --implements--> `BehaviorSubject State Management Pattern`  [EXTRACTED]
  src/app/services/perfil.service.ts → AGENTS.md
- `AGENTS.md Project Documentation` --documents--> `AtencionDTO`  [EXTRACTED]
  AGENTS.md → src/app/Models/DTOs/atencion-dto.ts
- `AGENTS.md Project Documentation` --documents--> `CursoDTO`  [EXTRACTED]
  AGENTS.md → src/app/Models/DTOs/curso-dto.ts
- `AGENTS.md Project Documentation` --documents--> `GrupoDTO`  [EXTRACTED]
  AGENTS.md → src/app/Models/DTOs/grupo-dto.ts

## Import Cycles
- None detected.

## Communities (76 total, 26 thin omitted)

### Community 0 - "Cursos Deportivos Core"
Cohesion: 0.07
Nodes (32): DeporteDTO, TODO: Al crear un curso deportivo se requiere que si el deporte no se encuentra…, GestionInscripcionesComponent, Component, DialogComponent, Component, @angular/common, @angular/forms (+24 more)

### Community 1 - "Categoria y Estadísticas"
Cohesion: 0.05
Nodes (13): CategoriaDTO, EstadisticasDTO, CategoriaService, Injectable, ReportesService, Injectable, NuevoCursoCategoriaComponent, Component (+5 more)

### Community 2 - "Deporte e Imagen"
Cohesion: 0.07
Nodes (12): DeporteDTO, ImagenDTO, DeporteService, Injectable, ImagenService, Injectable, FormCursoDeportiviComponent, Component (+4 more)

### Community 3 - "Login y Roles"
Cohesion: 0.15
Nodes (17): Google OAuth Login, Role: Coordinador, @angular/core, ref_angular_material_snack_bar, ref_angular_material_tooltip, rxjs, PerfilService, Injectable (+9 more)

### Community 4 - "Alumno y Perfil"
Cohesion: 0.08
Nodes (15): Alumno search by email (inscripcion flow), Role: Instructor, AlumnoDTO, PerfilDTO, AlumnoService, Injectable, TokenResponse, EstadoBusqueda (+7 more)

### Community 5 - "Dependencias NPM A"
Cohesion: 0.05
Nodes (36): name, private, version, @angular/animations, @angular/cdk, @angular/cli, @angular/compiler, @angular/compiler-cli (+28 more)

### Community 6 - "Auth Service"
Cohesion: 0.14
Nodes (14): AuthService, Injectable, PerfilService, Injectable, mockPerfilAdmin, TokenInterchangeService, Injectable, mockCurso (+6 more)

### Community 7 - "Escenario y Horario"
Cohesion: 0.12
Nodes (9): EscenarioDTO, HorarioDTO, EscenarioService, Injectable, HorarioService, Injectable, FormHorarioComponent, Component (+1 more)

### Community 8 - "CI y Documentación"
Cohesion: 0.09
Nodes (30): Angular CI Workflow, AGENTS.md Project Documentation, Angular 16.1.0 Framework, Angular Material 16.2.14, BehaviorSubject State Management Pattern, Bootstrap 5.3.3 CSS, Google OAuth2 angular-oauth2-oidc, jsPDF 3.0.2 PDF Export (+22 more)

### Community 9 - "Cursos Deportivos Ops"
Cohesion: 0.12
Nodes (5): CursoDTO, CursodeportivoService, Injectable, CursosDeportivosComponent, Component

### Community 10 - "Categoria Service"
Cohesion: 0.15
Nodes (6): CategoriaDTO, CategoriaService, Injectable, NuevoCursoCategoriaComponent, Component, Inject

### Community 11 - "Dependencias NPM B"
Cohesion: 0.08
Nodes (26): dependencies, @angular/animations, @angular/cdk, @angular/common, @angular/compiler, @angular/core, @angular/forms, @angular/material (+18 more)

### Community 12 - "Inscripcion y Disponibilidad"
Cohesion: 0.16
Nodes (6): DisponibilidadDTO, InscripcionDTO, InscripcionesService, Injectable, InscripcionGrupoComponent, Component

### Community 13 - "Horario Service"
Cohesion: 0.14
Nodes (6): HorarioDTO, HorarioService, Injectable, FormHorarioComponent, Component, Inject

### Community 14 - "Dialogs y Notificaciones"
Cohesion: 0.15
Nodes (10): Angular Material Dialog (MatDialog), ref_angular_cdk_dialog, ref_angular_material_divider, AlertaDTO, AlertaServiceService, Injectable, FormAlertaComponent, Component (+2 more)

### Community 15 - "Grupo Service"
Cohesion: 0.14
Nodes (5): GrupoDTO, GrupoService, Injectable, ListGruposComponent, Component

### Community 16 - "Perfil Service"
Cohesion: 0.16
Nodes (7): PerfilDTO, TokenResponse, alumnoMock, mockPerfil, CompletarPerfilComponent, perfilDummy, Component

### Community 17 - "Reportes Service"
Cohesion: 0.17
Nodes (5): EstadisticasDTO, ReportesService, Injectable, ref_angular_material_paginator, ref_angular_material_tabs

### Community 18 - "Asistencia y Clase"
Cohesion: 0.19
Nodes (7): AtencionDTO, ClaseDTO, AsistenciaService, Injectable, ClaseService, Injectable, ListDeportistasdeCursoComponent Template

### Community 19 - "Instructor Service"
Cohesion: 0.20
Nodes (7): InstructorDTO, PerfilInstructor, InstructorServisce, Injectable, ListaInstructoresComponent, Component, ref_angular_material_sort

### Community 20 - "Deporte Ops"
Cohesion: 0.13
Nodes (5): DeporteService, Injectable, FormCursoDeportiviComponent, Component, Inject

### Community 21 - "Instructor Display"
Cohesion: 0.21
Nodes (7): ref_angular_material_button, InstructorDTO, PerfilInstructor, InstructorServisce, Injectable, ListaInstructoresComponent, Component

### Community 22 - "Routing e InfoCurso"
Cohesion: 0.14
Nodes (7): AppRoutingModule, routes, NgModule, InformacionCursoComponent, Component, InformacinInstructorComponent, Component

### Community 23 - "Auth Service B"
Cohesion: 0.13
Nodes (4): AuthService, Injectable, HeaderComponent, Component

### Community 24 - "DevDependencias"
Cohesion: 0.12
Nodes (17): devDependencies, @angular/cli, @angular/compiler-cli, @angular-devkit/build-angular, jasmine-core, karma, karma-chrome-launcher, karma-coverage (+9 more)

### Community 25 - "Auth Interceptor"
Cohesion: 0.18
Nodes (7): AuthInterceptor, Injectable, ref_angular_common_http, AppComponent, Component, AuthInterceptor, Injectable

### Community 26 - "Alerta Service"
Cohesion: 0.26
Nodes (5): AlertaDTO, AlertaServiceService, Injectable, Component, VerNotificacionesComponent

### Community 28 - "Routing Estudiante"
Cohesion: 0.20
Nodes (6): routes, InformacionEstudianteComponent, Component, InformacinInstructorComponent, Component, ref_angular_material_table

### Community 29 - "Alumno Service"
Cohesion: 0.24
Nodes (6): AlumnoDTO, AlumnoService, Injectable, EstadoBusqueda, Inject, Optional

### Community 30 - "Form Grupos"
Cohesion: 0.19
Nodes (3): FormGruposComponent, Component, Inject

### Community 31 - "Reportes Component"
Cohesion: 0.18
Nodes (3): ReportesComponent, Component, ViewChild

### Community 32 - "E2E Tests"
Cohesion: 0.36
Nodes (6): injectPerfil(), API_BASE, TEST_CATEGORIA, TEST_GROUP, TEST_INSTRUCTOR_BASE, @playwright/test

### Community 33 - "Grupo Service B"
Cohesion: 0.29
Nodes (3): GrupoDTO, GrupoService, Injectable

### Community 34 - "Imagen Cursos"
Cohesion: 0.18
Nodes (4): ImagenDTO, ImagenService, Injectable, Inject

### Community 35 - "Header Component"
Cohesion: 0.15
Nodes (4): HeaderComponent, Component, SidenavComponent, Component

### Community 37 - "Home y Sidenav"
Cohesion: 0.28
Nodes (8): Role: Estudiante, ref_angular_cdk_layout, ref_angular_core_testing, ref_angular_material_list, ref_angular_material_sidenav, ref_angular_material_toolbar, ref_angular_platform_browser_animations, ref_rxjs_operators

### Community 39 - "Angular Config"
Cohesion: 0.23
Nodes (12): options, assets, codeCoverage, index, karmaConfig, main, outputPath, polyfills (+4 more)

### Community 40 - "Inscripciones Service"
Cohesion: 0.30
Nodes (3): InscripcionDTO, InscripcionesService, Injectable

### Community 41 - "Escenario Service"
Cohesion: 0.38
Nodes (3): EscenarioDTO, EscenarioService, Injectable

### Community 43 - "App Module"
Cohesion: 0.25
Nodes (6): AppComponent, Component, AppModule, NgModule, AppRoutingModule, NgModule

### Community 45 - "Build Config"
Cohesion: 0.25
Nodes (8): serve, production, browserTarget, budgets, outputHashing, builder, configurations, defaultConfiguration

### Community 46 - "Dev Config"
Cohesion: 0.25
Nodes (8): development, browserTarget, buildOptimizer, extractLicenses, namedChunks, optimization, sourceMap, vendorChunk

### Community 47 - "Atencion Asistencia"
Cohesion: 0.43
Nodes (3): AtencionDTO, AsistenciaService, Injectable

### Community 48 - "Clase Service"
Cohesion: 0.43
Nodes (3): ClaseDTO, ClaseService, Injectable

### Community 50 - "Package Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, e2e, e2e:report, ng, start, test, watch

### Community 51 - "Angular Workspace"
Cohesion: 0.29
Nodes (6): cli, analytics, newProjectRoot, projects, $schema, version

### Community 52 - "Angular Test Config"
Cohesion: 0.29
Nodes (7): extract-i18n, test, architect, builder, options, browserTarget, builder

### Community 56 - "Project Config"
Cohesion: 0.33
Nodes (6): prefix, projectType, root, schematics, sourceRoot, deporteParaTodos

### Community 61 - "Build Config B"
Cohesion: 0.50
Nodes (4): build, builder, configurations, defaultConfiguration

### Community 62 - "Bootstrap AppModule"
Cohesion: 0.50
Nodes (3): @angular/platform-browser-dynamic, AppModule, NgModule

## Knowledge Gaps
- **152 isolated node(s):** `EstadoBusqueda`, `PerfilInstructor`, `mockPerfilAdmin`, `mockCurso`, `mockGrupo` (+147 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 425 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@angular/core` connect `Login y Roles` to `Cursos Deportivos Core`, `Categoria y Estadísticas`, `Deporte e Imagen`, `Alumno y Perfil`, `Dependencias NPM A`, `Auth Service`, `Escenario y Horario`, `Cursos Deportivos Ops`, `Categoria Service`, `Inscripcion y Disponibilidad`, `Horario Service`, `Dialogs y Notificaciones`, `Grupo Service`, `Perfil Service`, `Reportes Service`, `Asistencia y Clase`, `Instructor Service`, `Instructor Display`, `Routing e InfoCurso`, `Auth Interceptor`, `Alerta Service`, `Routing Estudiante`, `Alumno Service`, `Grupo Service B`, `Imagen Cursos`, `Home y Sidenav`, `Inscripciones Service`, `Escenario Service`, `App Module`, `Atencion Asistencia`, `Clase Service`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `@angular/router` connect `Auth Service` to `Cursos Deportivos Core`, `Grupo Service B`, `Login y Roles`, `Alumno y Perfil`, `Home y Sidenav`, `Dependencias NPM A`, `Escenario y Horario`, `Inscripciones Service`, `Categoria Service`, `Inscripcion y Disponibilidad`, `Horario Service`, `Atencion Asistencia`, `Perfil Service`, `Reportes Service`, `Asistencia y Clase`, `Routing e InfoCurso`, `Routing Estudiante`, `Alumno Service`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `@angular/common` connect `Cursos Deportivos Core` to `Login y Roles`, `Alumno y Perfil`, `Dependencias NPM A`, `Auth Service`, `Escenario y Horario`, `Categoria Service`, `Inscripcion y Disponibilidad`, `Horario Service`, `Dialogs y Notificaciones`, `Perfil Service`, `Reportes Service`, `Asistencia y Clase`, `Instructor Service`, `Instructor Display`, `Routing e InfoCurso`, `Alerta Service`, `Routing Estudiante`, `Alumno Service`, `Grupo Service B`, `Home y Sidenav`, `Inscripciones Service`, `Escenario Service`, `Atencion Asistencia`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **What connects `EstadoBusqueda`, `PerfilInstructor`, `mockPerfilAdmin` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Cursos Deportivos Core` be split into smaller, more focused modules?**
  _Cohesion score 0.06686140863356053 - nodes in this community are weakly interconnected._
- **Should `Categoria y Estadísticas` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Deporte e Imagen` be split into smaller, more focused modules?**
  _Cohesion score 0.06976744186046512 - nodes in this community are weakly interconnected._