import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormInscripcionesComponent } from './viewswebsite/Components/usuarios/form-inscripciones/form-inscripciones.component';
import { HomeComponent } from './viewswebsite/pages/home/home.component';
import { CursosDeportivosComponent } from './viewswebsite/Components/cursos/cursos-deportivos/cursos-deportivos.component';
import { ListDeportistasdeCursoComponent} from './viewswebsite/Components/cursos/list-deportistasde-curso/list-deportistasde-curso.component';
import { ConfigTipoCursoComponent } from './viewswebsite/Components/cursos/config-tipo-curso/config-tipo-curso.component';
import { LoginComponent } from './viewswebsite/pages/login/login.component';
import { FormCursoDeportiviComponent } from './viewswebsite/Components/cursos/form-curso-deportivo/form-curso-deportivi.component';
import { NuevoCursoCategoriaComponent } from './viewswebsite/Components/cursos/nuevo-curso-categoria/nuevo-curso-categoria.component';
import { ListGruposComponent } from './viewswebsite/Components/cursos/list-grupos/list-grupos.component';
import { InformacinInstructorComponent } from './viewswebsite/Components/usuarios/informacion-instructor/informacion-instructor.component';
import { ListaInstructoresComponent } from './viewswebsite/Components/usuarios/lista-instructores/lista-instructores.component';
import { ReportesComponent } from './viewswebsite/Components/estadisticas/reportes/reportes.component';
import { InformacionEstudianteComponent } from './viewswebsite/Components/usuarios/informacion-estudiante/informacion-estudiante.component';
import { FormAlertaComponent } from './viewswebsite/Components/usuarios/form-alerta/form-alerta.component';
import { CompletarPerfilComponent } from './viewswebsite/pages/completar-perfil/completar-perfil.component';
import { InscripcionGrupoComponent } from './viewswebsite/Components/cursos/inscripcion-grupo/inscripcion-grupo.component';
import { DetalleInstructorComponent } from './viewswebsite/Components/usuarios/detalle-instructor/detalle-instructor.component';

const routes: Routes = [
  {path:'', redirectTo:'home',pathMatch:'full'},
  {path:'home', component:HomeComponent},
  {path:'inscripciones', component:FormInscripcionesComponent},
  {path: 'cursos_deportivos/:identificador', component: CursosDeportivosComponent}, //cursos deportivos de una categoría 
  {path: 'listaDeportistasCurso/:categoria/:curso/:anio/:iterable', component: ListDeportistasdeCursoComponent },//deportistas de curso
  {path: 'configuracionCatCurso', component: ConfigTipoCursoComponent},//Configuraciones de categoría
  {path: 'login', component: LoginComponent},
  {path: 'registroDeCursoDeportivo', component: FormCursoDeportiviComponent}, //registrar un deporte
  {path: 'nuevoCursoCategoria', component: NuevoCursoCategoriaComponent},
  {path: 'list-grupos/:categoria/:curso', component: ListGruposComponent},
  {path: 'info-instructor', component: InformacinInstructorComponent},
  {path: 'lista-instructores', component: ListaInstructoresComponent},
  {path: 'lista-instructores/:id', component: DetalleInstructorComponent},
  {path: 'reportes', component:ReportesComponent},
  {path: 'info-estudiante', component: InformacionEstudianteComponent},
  {path: 'notificacion', component: FormAlertaComponent},
  {path: 'completar-perfil', component: CompletarPerfilComponent},
  {path: 'inscripcion-grupo/:categoria/:curso/:anio/:iterable', component: InscripcionGrupoComponent},

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
