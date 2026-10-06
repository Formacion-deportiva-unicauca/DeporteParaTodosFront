import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  perfil: string = '';

  constructor(
    private router: Router,
    private perfilService: PerfilService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.perfilService.perfil$.subscribe(perfil => { this.perfil = perfil; });
  }

  redirectionTo(url: string): void {
    window.location.href = url;
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
