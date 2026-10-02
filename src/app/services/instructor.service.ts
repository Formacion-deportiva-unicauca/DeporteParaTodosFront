import { HttpClient } from "@angular/common/http";
import { InstructorDTO } from "../Models/DTOs/instructor-dto";
import { Injectable } from "@angular/core";
import { Observable, catchError, tap, throwError } from "rxjs";

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

    getInstructor(id: string): Observable<InstructorDTO> {
        return this.http.get<InstructorDTO>(`${this.apiUrl}/instructor?idInstructor=${encodeURIComponent(id)}`).pipe(
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