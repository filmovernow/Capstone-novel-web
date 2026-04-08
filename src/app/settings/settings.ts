import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './settings.html',
})
export class SettingsComponent {

  selectedTab = 'profile';
  showPw = false;
  pwError = '';
  toast = '';

  tabs = [
    { key: 'profile',  icon: '👤', label: 'โปรไฟล์' },
    { key: 'security', icon: '🔒', label: 'ความปลอดภัย' },
  ];

  profile = {
    name: 'นักอ่านตัวยง',
    penName: '',
    email: 'user@email.com',
    bio: '',
  };

  security = {
    current: '',
    newPw: '',
    confirm: '',
  };

  save() {
    this.showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
  }

  changePassword() {
    this.pwError = '';
    if (!this.security.current) {
      this.pwError = 'กรุณากรอกรหัสผ่านปัจจุบัน'; return;
    }
    if (this.security.newPw.length < 6) {
      this.pwError = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'; return;
    }
    if (this.security.newPw !== this.security.confirm) {
      this.pwError = 'รหัสผ่านใหม่ไม่ตรงกัน'; return;
    }
    this.security = { current: '', newPw: '', confirm: '' };
    this.showToast('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
  }

  private showToast(msg: string) {
    this.toast = msg;
    setTimeout(() => this.toast = '', 3000);
  }
}