import { Injectable } from "@angular/core";
import { Observable, throwError, catchError } from "rxjs";
import { AlumnoDTO } from "../Models/DTOs/alumno-dto";
import { PerfilDTO } from "../Models/DTOs/perfil-tdo";
import { HttpClient } from "@angular/common/http";
import { environment } from '../../environments/environment';


@Injectable({
    providedIn: 'root'
})

export class AlumnoService {

    private apiUrl = environment.apiUrl

    constructor(private http: HttpClient) { }

    getAlumnosGrupo(categoria: string, curso: string, anio: number, iterable: number): Observable<AlumnoDTO[]> {
        return this.http.get<AlumnoDTO[]>(`${this.apiUrl}/alumnosGrupo?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`).pipe(
        );
    }

    actualizarAlumno(id: number, data: { nombre: string, correo: string, tipoAlumno: string }): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/alumnos/${id}`, data).pipe(
            catchError((error) => throwError(error))
        );
    }

    buscarPorCorreo(correo: string): Observable<PerfilDTO> {
        return this.http.get<PerfilDTO>(`${this.apiUrl}/login?email=${encodeURIComponent(correo)}`);
    }
}