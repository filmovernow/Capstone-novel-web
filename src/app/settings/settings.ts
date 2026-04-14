import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserService } from '../service/user.service';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './settings.html',
})
export class SettingsComponent implements OnInit {

  selectedTab = 'profile';
  showPw = false;
  loadingPw = false;
  pwError = '';
  toast = '';

  tabs = [
    { key: 'profile',  icon: '👤', label: 'โปรไฟล์' },
    { key: 'security', icon: '🔒', label: 'ความปลอดภัย' },
  ];

  profile: any = {
    name: '',
    penName: '',
    email: '',
    bio: '',
  };

  security = {
    current: '',
    newPw: '',
    confirm: '',
  };
  currentUser: any = null;
  profileOpen = false;


  constructor(private userService: UserService, private cdr: ChangeDetectorRef, private router: Router) {}
    
  ngOnInit() {
    this.userService.loadProfile();

    this.userService.currentUser$.subscribe(user => {
      if (!user) return;
      
      this.currentUser = user;

      this.profile = {
        name: user.username || '',
        penName: user.pen_name || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar_path: user.avatar_path || ''
      };
    });
  }

  save() {
    const formData = new FormData();
    formData.append('username', this.profile.name);
    formData.append('pen_name', this.profile.penName);
    formData.append('bio', this.profile.bio);
    if (this.selectedFile) {
      formData.append('avatar_content', this.selectedFile);
    }
    this.userService.updateProfile(formData).subscribe({
      next: () => {
        if (this.selectedFile && this.previewUrl) {
          this.profile.avatar_path = this.previewUrl;
          
        }
        this.userService.loadProfile();
        this.showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
      },
      error: (err) => {
        console.log(err);
        this.showToast('บันทึกไม่สำเร็จ');
      }
    });
    
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }

  changePassword(event?: Event) {
  event?.preventDefault();
    this.pwError = '';
    this.toast = ''; // เคลียร์ success ก่อน

    if (this.loadingPw) return;
    this.loadingPw = true;

    if (!this.security.current) {
      this.pwError = 'กรุณากรอกรหัสผ่านปัจจุบัน';
      this.loadingPw = false;
      return;
    }

    if (this.security.newPw.length < 6) {
      this.pwError = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร';
      this.loadingPw = false;
      return;
    }

    if (this.security.newPw !== this.security.confirm) {
      this.pwError = 'รหัสผ่านใหม่ไม่ตรงกัน';
      this.loadingPw = false;
      return;
    }

    this.userService.changePassword({
      current_password: this.security.current,
      new_password: this.security.newPw,
      password_confirmation: this.security.confirm
    }).subscribe({
      next: (res: any) => {

        this.pwError = ''; // 🔥 สำคัญ: ล้าง error

        this.security = { current: '', newPw: '', confirm: '' };

        this.toast = 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว'; // ใช้แทน success

        this.loadingPw = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.toast = ''; // 🔥 ล้าง success

        this.pwError = err.error?.error || 'เปลี่ยนรหัสผ่านไม่สำเร็จ';
        this.loadingPw = false;
        this.cdr.detectChanges();
      }
    });
  }
  
  private showToast(msg: string) {
  this.toast = msg;
  this.cdr.detectChanges(); // 🔥 สำคัญมาก

  setTimeout(() => {
    this.toast = '';
    this.cdr.detectChanges();
  }, 3000);
}

  previewUrl: string | null = null;
  selectedFile: File | null = null;
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;

  
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}