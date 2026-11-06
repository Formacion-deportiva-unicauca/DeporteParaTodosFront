import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { ImagenDTO } from '../Models/DTOs/imagen-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImagenService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Método para obtener la imagen
  getimagen(idImagen: number): Observable<ImagenDTO> {
    return this.http.get<ImagenDTO>(`${this.apiUrl}/imagen?idImagen=${idImagen}`).pipe(
      catchError((error) => {
        return throwError(error);
      })
    );

  }

  postImagen(file: File): Observable<ImagenDTO> {
    const formData = new FormData();
    formData.append('datosMultipartFile', file);
    formData.append('nombre', file.name);
    formData.append('tipoArchivo', file.type);
    formData.append('longitud', file.size.toString());
    return this.http.post<ImagenDTO>(`${this.apiUrl}/imagenMultipart`, formData).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }
}
