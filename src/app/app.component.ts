import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from './shared/components/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, SidebarComponent],
  template: `
    <mat-sidenav-container fullscreen class="app-sidenav-container">
      <mat-sidenav mode="side" opened class="app-sidenav">
        <app-sidebar />
      </mat-sidenav>
      <mat-sidenav-content class="main-area">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    .app-sidenav-container { height: 100vh; }
    .app-sidenav {
      width: 240px;
      overflow-x: hidden;
      background: linear-gradient(180deg, #2d3033 0%, #222426 100%);
      border-right: 1px solid rgba(255,255,255,.08);
      box-shadow: 2px 0 12px rgba(0,0,0,.25);
    }
    .main-area { display: flex; flex-direction: column; overflow: hidden; }
  `],
})
export class AppComponent {}
