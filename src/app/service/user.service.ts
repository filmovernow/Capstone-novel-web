import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private API_URL = 'http://localhost:3000/api/v1/user';

  private userSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: token || ''
    });
  }

  loadProfile() {
    const token = localStorage.getItem('token');

    if (!token) {
      this.userSubject.next(null); // ✅ บังคับ emit
      return;
    }

    this.http.get(`${this.API_URL}/profile`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res: any) => {
        this.userSubject.next(res);
      },
      error: (err) => {
        console.log('โหลดโปรไฟล์ไม่สำเร็จ', err);

        this.userSubject.next(null); // ✅ สำคัญมาก

        if (err.status === 401) {
          this.logout();
        }
      }
    });
  }

  updateProfile(formData: FormData) {
    return this.http.patch(`${this.API_URL}/profile`, formData, {
      headers: this.getHeaders()
    }).pipe(
      tap((res: any) => {
        this.userSubject.next(res.user);
      })
    );
  }

  changePassword(data: {
    current_password: string;
    new_password: string;
    password_confirmation: string;
  }) {
    return this.http.patch(`${this.API_URL}/password`, data, {
      headers: this.getHeaders()
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.userSubject.next(null);
  }

  getCurrentUser() {
    return this.userSubject.value;
  }

  setSession(res: any) {
    localStorage.setItem('token', res.token);
    this.userSubject.next(res.user);
  }
}