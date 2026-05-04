import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../service/user.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
})
export class SettingsComponent implements OnInit {

  selectedTab = 'profile';
  showPw = false;
  loadingPw = false;
  pwError = '';
  toast = '';
  toastType: 'success' | 'error' = 'success';

  tabs = [
    { key: 'profile',  icon: '👤', label: 'โปรไฟล์' },
    { key: 'security', icon: '🔒', label: 'ความปลอดภัย' },
  ];

  profile: any = {
    name: '',
    email: '',
    avatar_path: ''
  };

  security = {
    current: '',
    newPw: '',
    confirm: '',
  };
  currentUser: any = null;
  profileOpen = false;

  previewUrl: string | null = null;
  selectedFile: File | null = null;

  isGoogleLogin: boolean = false;

  constructor(
    private userService: UserService, 
    private cdr: ChangeDetectorRef, 
    private router: Router
  ) {}
    
  ngOnInit() {
    this.userService.loadProfile();

    this.userService.currentUser$.subscribe(user => {
      if (!user) return;
      
      this.currentUser = user;
      
      const isGoogleLoginStorage = localStorage.getItem('is_google_login') === 'true';
      
      this.isGoogleLogin = isGoogleLoginStorage;
      
      if (this.isGoogleLogin) {
        this.security = { current: '', newPw: '', confirm: '' };
        // ถ้าเป็น Google login ให้อยู่ที่โปรไฟล์เฉยๆ
        this.selectedTab = 'profile';
      }

      this.profile = {
        name: user.username || '',
        email: user.email || '',
        avatar_path: user.avatar_path || ''
      };
      
      this.cdr.detectChanges();
    });
  }

  formatNumber(value: number): string {
    if (value === undefined || value === null) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }

  save() {
    const formData = new FormData();
    formData.append('username', this.profile.name);

    if (this.selectedFile) {
      formData.append('avatar', this.selectedFile); // ✅ ใช้ file จริง
    }

    this.userService.updateProfile(formData).subscribe({
      next: (res: any) => {
        this.showToastMessage('อัปเดตโปรไฟล์สำเร็จ! 🎉', 'success');

        this.previewUrl = null;
        this.selectedFile = null;

        this.userService.loadProfile();
      },
      error: (err) => {
        console.error(err);
        this.showToastMessage('เกิดข้อผิดพลาด ❌', 'error');
      }
    });
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('is_google_login');
    this.router.navigate(['/']);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  changePassword(event?: Event) {
    event?.preventDefault();
    
    this.pwError = '';
    this.toast = '';

    if (this.loadingPw) return;
    this.loadingPw = true;

    if (!this.security.current) {
      this.showToastMessage('กรุณากรอกรหัสผ่านปัจจุบัน', 'error');
      this.loadingPw = false;
      return;
    }

    if (this.security.newPw.length < 6) {
      this.showToastMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', 'error');
      this.loadingPw = false;
      return;
    }

    if (this.security.newPw !== this.security.confirm) {
      this.showToastMessage('รหัสผ่านใหม่ไม่ตรงกัน', 'error');
      this.loadingPw = false;
      return;
    }

    this.userService.changePassword({
      current_password: this.security.current,
      new_password: this.security.newPw,
      password_confirmation: this.security.confirm
    }).subscribe({
      next: (res: any) => {
        this.security = { current: '', newPw: '', confirm: '' };
        this.showToastMessage('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว! 🔒', 'success');
        this.loadingPw = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showToastMessage(err.error?.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ', 'error');
        this.loadingPw = false;
        this.cdr.detectChanges();
      }
    });
  }

  navigateTo(path: string) {
    this.profileOpen = false;
    this.router.navigate([path]);
  }

  goToTopup() {
    this.router.navigate(['/topup']);
  }
  
  private showToastMessage(message: string, type: 'success' | 'error') {
    this.toast = message;
    this.toastType = type;
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.toast = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.showToastMessage('ไฟล์รูปต้องไม่เกิน 5MB', 'error');
      return;
    }

    if (!file.type.match(/image\/(jpeg|png|jpg|gif)/)) {
      this.showToastMessage('กรุณาเลือกรูปภาพเท่านั้น', 'error');
      return;
    }

    this.selectedFile = file;

    // preview อย่างเดียว
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
      this.profile.avatar_path = this.previewUrl;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    this.showToastMessage('เลือกรูปภาพเรียบร้อยแล้ว ✅', 'success');
  }

}