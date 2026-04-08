import { Routes } from '@angular/router';
import { Home } from './home/home';
import { AuthComponent } from './auth/auth';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'auth', component: AuthComponent },
  { path: '**', redirectTo: '' },
];