import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  };

  constructor(private router: Router) {}

  setMode(login: boolean) {
    this.isLogin = login;
    this.errorMsg = '';
    this.form = { name: '', email: '', password: '', confirmPassword: '' };
  }

  onSubmit() {
    this.errorMsg = '';

    if (!this.form.email || !this.form.password) {
      this.errorMsg = 'กรุณากรอกอีเมลและรหัสผ่าน';
      return;
    }

    if (!this.isLogin) {
      if (!this.form.name) {
        this.errorMsg = 'กรุณากรอกชื่อผู้ใช้';
        return;
      }
      if (this.form.password !== this.form.confirmPassword) {
        this.errorMsg = 'รหัสผ่านไม่ตรงกัน';
        return;
      }
      if (this.form.password.length < 6) {
        this.errorMsg = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
        return;
      }
    }

    this.loading = true;
    // จำลอง API call
    setTimeout(() => {
      this.loading = false;
      this.router.navigate(['/']);
    }, 1500);
  }
}