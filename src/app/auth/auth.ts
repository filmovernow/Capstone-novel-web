import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../service/user.service'; 
@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
})
export class AuthComponent {
  isLogin = true;
  showPassword = false;
  loading = false;
  errorMsg = '';

  form = {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  constructor(
    private router: Router, 
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private userService: UserService
  ) {}

  setMode(login: boolean) {
    this.isLogin = login;
    this.errorMsg = '';
    this.form = { username: '', email: '', password: '', confirmPassword: '' };
  }

  onSubmit() {
    this.errorMsg = '';

    if (!this.form.email || !this.form.password) {
      this.errorMsg = 'กรุณากรอกอีเมลและรหัสผ่าน';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.errorMsg = 'กรุณากรอกรูปแบบอีเมลให้ถูกต้อง (เช่น name@example.com)';
      return;
    }

    if (!this.isLogin) {
      if (!this.form.username) {
        this.errorMsg = 'กรุณากรอกชื่อผู้ใช้';
        return;
      }
      if (this.form.password !== this.form.confirmPassword) {
        this.errorMsg = 'รหัสผ่านไม่ตรงกัน';
        return;
      }
    }

    this.loading = true;
    this.cdr.detectChanges();

    if (this.isLogin) {
      // LOGIN
      this.http.post('http://localhost:3000/api/v1/user/sign-in', {
        identifier: this.form.email.toLowerCase(),
        password: this.form.password
      }).subscribe({
        next: (res: any) => {
          //แปลงเป็น Bearer Token และเซฟลง localStorage
          const bearerToken = `Bearer ${res.token}`;
          localStorage.setItem('token', bearerToken);
          this.userService.loadProfile();
          this.loading = false;
          this.cdr.detectChanges();
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.errorMsg = err.error?.message || 'Login failed';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });

    } else {
      // SIGN UP
      this.http.post('http://localhost:3000/api/v1/user/sign-up', {
        user: {
          email: this.form.email,
          username: this.form.username,
          password: this.form.password,
          password_confirmation: this.form.confirmPassword
        }
      }).subscribe({
        next: (res: any) => {
          this.loading = false;

          if (res.token) {
            //แปลงเป็น Bearer Token และเซฟลง localStorage
            const bearerToken = `Bearer ${res.token}`;
            localStorage.setItem('token', bearerToken);
            
            this.router.navigate(['/']);
          } else {
            this.errorMsg = res.message || 'สมัครสมาชิกไม่สำเร็จ อีเมลอาจถูกใช้งานแล้ว';
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          console.log(err);

          const errorMap: any = {
            'Email has already been taken': 'อีเมลนี้ถูกใช้งานแล้ว',
            'Username has already been taken': 'ชื่อผู้ใช้นี้ถูกใช้แล้ว'
          };

          try {
            if (Array.isArray(err.error?.errors)) {
              this.errorMsg = err.error.errors
                .map((e: string) => errorMap[e] || e)
                .join(', ');
            } else {
              this.errorMsg = err.error?.message || 'Signup failed';
            }
          } catch (e) {
            this.errorMsg = 'เกิดข้อผิดพลาด หรืออีเมลนี้ถูกใช้งานแล้ว';
          }

          this.cdr.detectChanges();
        }
      });
    }
  }
}