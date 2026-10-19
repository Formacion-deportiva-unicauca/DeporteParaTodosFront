import { HttpClient } from "@angular/common/http";
import { InstructorDTO, PerfilInstructor } from "../Models/DTOs/instructor-dto";
import { PlazoCargaDTO } from "../Models/DTOs/plazo-carga-dto";
import { ProrrogaDTO, ProrrogaRequestDTO } from "../Models/DTOs/prorroga-registro-dto";
import { Injectable } from "@angular/core";
import { Observable, catchError, throwError } from "rxjs";

@Injectable({
    providedIn: 'root',
})

export class InstructorServisce {

    private apiUrl = 'http://127.0.0.1:8082/api/v2';

    constructor(private http: HttpClient) { }

    getInstructores(): Observable<InstructorDTO[]> {
        return this.http.get<InstructorDTO[]>(`${this.apiUrl}/instructores`).pipe(
            catchError((error) => {
                return throwError(error);
            })
        );
    }

    getInstructor(id: string): Observable<PerfilInstructor> {
        return this.http.get<PerfilInstructor>(`${this.apiUrl}/instructor?idInstructor=${encodeURIComponent(id)}`).pipe(
            catchError((error) => {
                return throwError(error);
            })
        );
    }

    actualizarInstructor(id: string, datos: { nombre: string; correo: string }): Observable<InstructorDTO> {
        return this.http.put<InstructorDTO>(`${this.apiUrl}/instructor/${encodeURIComponent(id)}`, datos).pipe(
            catchError((error) => {
                return throwError(error);
            })
        );
    }

    getPlazosCarga(): Observable<PlazoCargaDTO[]> {
        return this.http.get<PlazoCargaDTO[]>(`${this.apiUrl}/instructores/plazos-carga`).pipe(
            catchError((error) => {
                return throwError(error);
            })
        );
    }

    asignarPlazoCarga(id: string, fechaLimite: string): Observable<PlazoCargaDTO> {
        return this.http.put<PlazoCargaDTO>(`${this.apiUrl}/instructor/${encodeURIComponent(id)}/plazo-carga`, { fechaLimite }).pipe(
            catchError((error) => {
                return throwError(error);
            })
        );
    }

    asignarProrrogaRegistro(req: ProrrogaRequestDTO): Observable<ProrrogaDTO[]> {
        return this.http.put<ProrrogaDTO[]>(`${this.apiUrl}/instructores/prorroga-registro`, req).pipe(
            catchError((error) => {
                return throwError(error);
            })
        );
    }

    getProrrogasRegistro(anio: number, mes: number): Observable<ProrrogaDTO[]> {
        return this.http.get<ProrrogaDTO[]>(
            `${this.apiUrl}/instructores/prorroga-registro?anio=${encodeURIComponent(String(anio))}&mes=${encodeURIComponent(String(mes))}`
        ).pipe(
            catchError((error) => {
                return throwError(error);
            })
        );
    }

    deleteInstructor(instructorId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/instructor?instructorId=${encodeURIComponent(instructorId)}`).pipe(
            catchError((error) => {
                return throwError(error);
            })
        );
    }
}