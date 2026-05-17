import { Component, ChangeDetectorRef, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../service/user.service';
import { GoogleAuthService } from '../service/google-auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
})
export class AuthComponent implements OnInit, AfterViewInit {
  @ViewChild('googleButton') googleButtonRef!: ElementRef;
  
  isLogin = true;
  showPassword = false;
  loading = false;
  errorMsg = '';

  // Forgot password
  showForgotPassword = false;
  forgotEmail = '';
  otpSent = false;
  otpCode = '';
  newPassword = '';
  confirmNewPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;

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
    private userService: UserService,
    private googleAuth: GoogleAuthService
  ) {}

  ngOnInit() {}

  ngAfterViewInit() {
    this.initGoogleButton();
  }

  initGoogleButton() {
    if (this.googleButtonRef && this.googleButtonRef.nativeElement) {
      this.googleAuth.initGoogleSignIn(this.googleButtonRef.nativeElement);
    }
  }

  setMode(login: boolean) {
    this.isLogin = login;
    this.errorMsg = '';
    this.form = { username: '', email: '', password: '', confirmPassword: '' };
    
    // ✅ รีโหลด Google button เมื่อเปลี่ยน mode
    setTimeout(() => {
      this.initGoogleButton();
    }, 100);
  }

  goHome() {
    this.router.navigate(['/']);
  }

  openForgotPassword() {
    this.showForgotPassword = true;
    this.otpSent = false;
    this.forgotEmail = '';
    this.otpCode = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.errorMsg = '';
  }

  cancelForgotPassword() {
    this.showForgotPassword = false;
    this.otpSent = false;
    this.forgotEmail = '';
    this.otpCode = '';
    this.newPassword = '';
    this.confirmNewPassword = '';
    this.errorMsg = '';
    
    // ✅ ✅ ✅ สำคัญ: โหลด Google button ใหม่เมื่อกลับมา
    setTimeout(() => {
      this.initGoogleButton();
    }, 200);
  }

  requestOTP() {
    this.errorMsg = '';

    if (!this.forgotEmail) {
      this.errorMsg = 'กรุณากรอกอีเมล';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.forgotEmail)) {
      this.errorMsg = 'กรุณากรอกรูปแบบอีเมลให้ถูกต้อง';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.http.post('http://localhost:3000/api/v1/forgot_password', {
      email: this.forgotEmail.toLowerCase()
    }).subscribe({
      next: () => {
        this.loading = false;
        this.otpSent = true;
        this.errorMsg = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
        this.cdr.detectChanges();
      }
    });
  }

  resetPassword() {
    this.errorMsg = '';

    if (!this.otpCode || this.otpCode.length !== 6) {
      this.errorMsg = 'กรุณากรอกรหัส OTP 6 หลัก';
      return;
    }

    if (!this.newPassword) {
      this.errorMsg = 'กรุณากรอกรหัสผ่านใหม่';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMsg = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMsg = 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน';
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.http.post('http://localhost:3000/api/v1/reset_password', {
      email: this.forgotEmail.toLowerCase(),
      token: this.otpCode,
      password: this.newPassword
    }).subscribe({
      next: () => {
        this.loading = false;
        alert('เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
        this.cancelForgotPassword();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว';
        this.cdr.detectChanges();
      }
    });
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
      if (this.form.password.length < 6) {
        this.errorMsg = 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
        return;
      }
    }

    this.loading = true;
    this.cdr.detectChanges();

    if (this.isLogin) {
      this.http.post('http://localhost:3000/api/v1/user/sign-in', {
        identifier: this.form.email.toLowerCase(),
        password: this.form.password
      }).subscribe({
        next: (res: any) => {
          const bearerToken = `Bearer ${res.token}`;
          localStorage.setItem('token', bearerToken);
          this.userService.loadProfile();
          this.loading = false;
          this.cdr.detectChanges();
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.errorMsg = err.error?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    } else {
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
            const bearerToken = `Bearer ${res.token}`;
            localStorage.setItem('token', bearerToken);
            this.router.navigate(['/']);
          } else {
            this.errorMsg = res.message || 'สมัครสมาชิกไม่สำเร็จ';
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
              this.errorMsg = err.error.errors.map((e: string) => errorMap[e] || e).join(', ');
            } else {
              this.errorMsg = err.error?.message || 'สมัครสมาชิกไม่สำเร็จ';
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