import { LOCALE_ID, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { OAuthModule } from 'angular-oauth2-oidc';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './viewswebsite/pages/header/header.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { FechaEsAdapter } from './shared/fecha-es.adapter';
import { AlertaServiceService } from './services/alerta-service.service';
import { AuthInterceptor } from './services/auth.interceptor';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

registerLocaleData(localeEs);


@NgModule({
  declarations: [
    AppComponent,

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HeaderComponent,
    BrowserAnimationsModule,
    OAuthModule.forRoot(),
    HttpClientModule,
    MatSnackBarModule,
    MatNativeDateModule,
  ],
  providers: [
    AlertaServiceService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'es' },
    // Calendarios (MatDatepicker): sin esto en la RAÍZ el calendario emergente no abre dentro de un diálogo.
    // FechaEsAdapter escribe y lee dd/MM/yyyy.
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: DateAdapter, useClass: FechaEsAdapter },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
