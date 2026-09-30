import { Injectable,  } from '@angular/core';
import { ClaseDTO } from '../Models/DTOs/clase-dto';
import { HttpClient } from '@angular/common/http';
import { Observable,  } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ClaseService {
  private apiUrl = 'http://127.0.0.1:8082/api/v2';
  
  constructor(private http:HttpClient) { }

  postClase(datosClase: ClaseDTO):Observable<ClaseDTO>{
    return this.http.post<ClaseDTO>(`${this.apiUrl}/claseGrupo`, datosClase).pipe();    
  }

  getClase(categoria:string, curso:string, anio: number, iterable:number):Observable<ClaseDTO[]>{
    return this.http.get<ClaseDTO[]>(`${this.apiUrl}/clasesGrupo?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`).pipe();
  }
}
