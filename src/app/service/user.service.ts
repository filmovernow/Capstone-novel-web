import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, tap, firstValueFrom } from 'rxjs';

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
      this.userSubject.next(null);
      return;
    }

    this.http.get(`${this.API_URL}/profile`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res: any) => {
        // ✅ ตรวจสอบ role จาก backend หรือ username
        if (res.username === 'admin') {
          res.role = 'admin';
        }
        this.userSubject.next(res);
      },
      error: (err) => {
        console.log('โหลดโปรไฟล์ไม่สำเร็จ', err);
        this.userSubject.next(null);
        if (err.status === 401) {
          this.logout();
        }
      }
    });
  }

  updateProfile(formData: FormData) {
    return this.patch(`${this.API_URL}/profile`, formData, {
      headers: this.getHeaders().delete('Content-Type')
    }).pipe(
      tap((res: any) => {
        if (res.user) {
          if (res.user.avatar_path) {
            res.user.avatar_path = `${res.user.avatar_path}?t=${Date.now()}`;
          }
          // ✅ ตรวจสอบ role อีกที
          if (res.user.username === 'admin') {
            res.user.role = 'admin';
          }
          this.userSubject.next(res.user);
        }
      })
    );
  }

  changePassword(data: {
    current_password: string;
    new_password: string;
    password_confirmation: string;
  }) {
    return this.patch(`${this.API_URL}/password`, data, {
      headers: this.getHeaders()
    });
  }

  logout() {
    localStorage.removeItem('token');
    this.userSubject.next(null);
  }

  // ✅ แก้ไข getCurrentUser ให้ return ค่าปัจจุบัน (synchronous)
  getCurrentUser(): any {
    return this.userSubject.value;
  }

  // ✅ เพิ่ม method สำหรับ async (ถ้าต้องการ)
  async getCurrentUserAsync(): Promise<any> {
    if (this.userSubject.value) {
      return this.userSubject.value;
    }
    return firstValueFrom(this.currentUser$);
  }

  setSession(res: any) {
    localStorage.setItem('token', res.token);
    // ✅ ตรวจสอบ role
    if (res.user.username === 'admin') {
      res.user.role = 'admin';
    }
    this.userSubject.next(res.user);
  }

  // ✅ เพิ่ม method เช็คว่าเป็น admin ไหม
  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'admin' || user?.username === 'admin';
  }

  private patch(url: string, body: any, options?: any) {
    return this.http.patch(url, body, options);
  }
}