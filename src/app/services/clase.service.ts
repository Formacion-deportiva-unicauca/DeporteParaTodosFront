import { Injectable,  } from '@angular/core';
import { ClaseDTO } from '../Models/DTOs/clase-dto';
import { HttpClient } from '@angular/common/http';
import { Observable,  } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClaseService {
  private apiUrl = environment.apiUrl;
  
  constructor(private http:HttpClient) { }

  postClase(datosClase: ClaseDTO):Observable<ClaseDTO>{
    return this.http.post<ClaseDTO>(`${this.apiUrl}/claseGrupo`, datosClase).pipe();    
  }

  getClase(categoria:string, curso:string, anio: number, iterable:number):Observable<ClaseDTO[]>{
    return this.http.get<ClaseDTO[]>(`${this.apiUrl}/clasesGrupo?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`).pipe();
  }
}
