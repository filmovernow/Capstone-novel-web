import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { UserService } from './user.service';

declare const google: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  constructor(
    private http: HttpClient,
    private router: Router,
    private userService: UserService
  ) {}

  initGoogleSignIn(buttonElement: HTMLElement) {
    google.accounts.id.initialize({
      client_id: '894082170107-ejvqm487h7j72g8e2k1oihebrc27dlq9.apps.googleusercontent.com',
      callback: (response: any) => this.handleGoogleLogin(response)
    });
    
    google.accounts.id.renderButton(
      buttonElement,
      { theme: 'outline', size: 'large', width: '100%' }
    );
  }

  handleGoogleLogin(response: any) {
    const payload = this.decodeJwtResponse(response.credential);
    
    const data = {
      user: {
        email: payload.email,
        username: payload.name,
        password: payload.sub,
        password_confirmation: payload.sub
      }
    };

    this.http.post('http://localhost:3000/api/v1/user/sign-up', data).subscribe({
      next: (res: any) => {
        if (res.token) {
          localStorage.setItem('token', `Bearer ${res.token}`);
          // ✅ ตั้ง flag ว่า login ด้วย Google
          localStorage.setItem('is_google_login', 'true');
          this.userService.loadProfile();
          this.router.navigate(['/']);
        }
      },
      error: (err: any) => {
        if (err.status === 422) {
          this.http.post('http://localhost:3000/api/v1/user/sign-in', {
            identifier: payload.email,
            password: payload.sub
          }).subscribe({
            next: (loginRes: any) => {
              localStorage.setItem('token', `Bearer ${loginRes.token}`);
              // ✅ ตั้ง flag ว่า login ด้วย Google
              localStorage.setItem('is_google_login', 'true');
              this.userService.loadProfile();
              this.router.navigate(['/']);
            },
            error: (loginErr: any) => {
              console.error('Google login failed', loginErr);
            }
          });
        }
      }
    });
  }

  private decodeJwtResponse(token: string) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }
}