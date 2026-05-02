// src/app/admin/admin-dashboard.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, User, Novel, Withdrawal } from './admin.service';
import { UserService } from '../service/user.service';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';  // ✅ เพิ่ม HttpClient

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html'
})
export class AdminDashboardComponent implements OnInit {
  
  // Users
  users: User[] = [];
  totalUsers = 0;
  loading = false;
  
  // Novels
  novels: Novel[] = [];
  loadingNovels = false;
  
  // Withdrawals
  withdrawals: Withdrawal[] = [];
  loadingWithdrawals = false;
  
  // Current User
  currentUser: any = null;
  isAdmin = false;
  
  // Tab
  activeTab: 'users' | 'novels' | 'withdrawals' = 'users';
  
  apiUrl = 'http://localhost:3000/api/v1';  // ✅ ใช้ apiUrl แบบเดียวกับ home

  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient  // ✅ เพิ่ม HttpClient
  ) {}

  ngOnInit() {
    console.log('🔵 AdminDashboardComponent ทำงานแล้ว!');
    
    this.userService.currentUser$.pipe(
      filter(user => user !== null)
    ).subscribe(user => {
      console.log('🔵 user in component:', user);
      this.currentUser = user;
      this.isAdmin = user?.role === 'admin' || user?.username === 'admin';
      
      if (!this.isAdmin) {
        console.log('⚠️ Guard พลาด! redirect อีกที');
        this.router.navigate(['/']);
        return;
      }
      
      this.loadUsers();
    });
  }

  // ======================= USERS =======================
  loadUsers() {
    console.log('🟡 loadUsers() ถูกเรียก');
    this.loading = true;
    this.cdr.detectChanges();
    
    this.adminService.getUsers().subscribe({
      next: (res) => {
        console.log('🟢 โหลดสำเร็จ users:', res.users?.length);
        this.users = res.users || [];
        this.totalUsers = res.total || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('🔴 โหลด users ล้มเหลว:', err);
        this.loading = false;
        this.cdr.detectChanges();
        
        if (err.status === 401 || err.status === 403) {
          alert('คุณไม่มีสิทธิ์เข้าถึงหรือ session หมดอายุ');
          this.router.navigate(['/']);
        }
      }
    });
  }

  toggleUserStatus(user: User) {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    const action = newStatus === 'banned' ? 'แบน' : 'ปลดแบน';
    
    if (confirm(`${action} ผู้ใช้ "${user.username}"?`)) {
      const oldStatus = user.status;
      user.status = newStatus;
      this.cdr.detectChanges();
      
      this.adminService.updateUserStatus(user.id, newStatus).subscribe({
        next: (res) => {
          console.log('🟢 อัปเดตสำเร็จ:', res);
          alert(`${action}ผู้ใช้สำเร็จ`);
        },
        error: (err) => {
          console.error('🔴 อัปเดตล้มเหลว:', err);
          user.status = oldStatus;
          this.cdr.detectChanges();
          alert(`${action}ผู้ใช้ล้มเหลว: ${err.error?.error || err.message}`);
        }
      });
    }
  }

  deleteUser(user: User) {
    if (user.id === this.currentUser?.id) {
      alert('คุณไม่สามารถลบตัวเองได้');
      return;
    }
    
    if (confirm(`⚠️ ลบผู้ใช้ "${user.username}" ถาวร? การลบจะลบนิยายและข้อมูลทั้งหมดด้วย!`)) {
      this.adminService.deleteUser(user.id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== user.id);
          this.totalUsers--;
          this.cdr.detectChanges();
          alert('ลบผู้ใช้สำเร็จ');
        },
        error: (err) => {
          console.error('🔴 ลบล้มเหลว:', err);
          alert(`ลบผู้ใช้ล้มเหลว: ${err.error?.error || err.message}`);
        }
      });
    }
  }

  // ======================= NOVELS =======================
  // ✅ ใช้วิธีเดียวกับ home.ts - โหลดจาก /api/v1/novels
  loadNovels() {
    console.log('🟡 loadNovels() ถูกเรียก');
    this.loadingNovels = true;
    this.cdr.detectChanges();
    
    // ✅ ใช้ Http GET แบบเดียวกับ home
    this.http.get<any[]>(`${this.apiUrl}/novels`).subscribe({
      next: (novels) => {
        console.log('🟢 โหลดนิยายสำเร็จ:', novels.length);
        // ✅ filter เอาเฉพาะ published เพื่อความสวยงาม หรือจะเอาทุกเรื่องก็ได้
        this.novels = novels;  // หรือ novels.filter(n => n.status === 'published')
        this.loadingNovels = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('🔴 โหลดนิยายล้มเหลว:', err);
        this.loadingNovels = false;
        this.cdr.detectChanges();
        alert('โหลดข้อมูลนิยายล้มเหลว: ' + (err.error?.message || err.message));
      }
    });
  }

  updateNovelStatus(novel: Novel, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;
    
    if (confirm(`เปลี่ยนสถานะนิยาย "${novel.title}" เป็น ${newStatus}?`)) {
      const oldStatus = novel.status;
      novel.status = newStatus;
      this.cdr.detectChanges();
      
      // ✅ ใช้ update จาก admin service
      this.adminService.updateNovelStatus(novel.id, newStatus).subscribe({
        next: (res) => {
          console.log('🟢 อัปเดตสถานะนิยายสำเร็จ:', res);
          alert(`เปลี่ยนสถานะนิยายเป็น ${newStatus} สำเร็จ`);
        },
        error: (err) => {
          console.error('🔴 อัปเดตล้มเหลว:', err);
          novel.status = oldStatus;
          this.cdr.detectChanges();
          alert('เปลี่ยนสถานะนิยายล้มเหลว: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  deleteNovel(novel: Novel) {
    if (confirm(`⚠️ ลบนิยาย "${novel.title}" ถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
      this.adminService.deleteNovel(novel.id).subscribe({
        next: () => {
          this.novels = this.novels.filter(n => n.id !== novel.id);
          this.cdr.detectChanges();
          alert('ลบนิยายสำเร็จ');
        },
        error: (err) => {
          console.error('🔴 ลบนิยายล้มเหลว:', err);
          alert(`ลบนิยายล้มเหลว: ${err.error?.error || err.message}`);
        }
      });
    }
  }

  // ======================= WITHDRAWALS =======================
  loadWithdrawals() {
    console.log('🟡 loadWithdrawals() ถูกเรียก');
    this.loadingWithdrawals = true;
    this.cdr.detectChanges();
    
    this.adminService.getWithdrawals().subscribe({
      next: (res) => {
        console.log('🟢 โหลดคำขอถอนเงินสำเร็จ:', res.withdrawals?.length);
        this.withdrawals = res.withdrawals || [];
        this.loadingWithdrawals = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('🔴 โหลดคำขอถอนเงินล้มเหลว:', err);
        this.loadingWithdrawals = false;
        this.cdr.detectChanges();
        // ✅ ถ้ายังไม่มี API ก็แค่แสดงว่าไม่มีข้อมูล
        if (err.status === 404) {
          console.log('⚠️ Withdrawals API ยังไม่มี');
          this.withdrawals = [];
          this.loadingWithdrawals = false;
        } else {
          alert('โหลดข้อมูลคำขอถอนเงินล้มเหลว');
        }
      }
    });
  }

  updateWithdrawalStatus(withdrawal: Withdrawal, event: Event) {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;
    
    if (confirm(`เปลี่ยนสถานะคำขอถอนเงิน ${withdrawal.amount} บาท ของ ${withdrawal.username} เป็น ${newStatus}?`)) {
      const oldStatus = withdrawal.status;
      withdrawal.status = newStatus;
      this.cdr.detectChanges();
      
      this.adminService.updateWithdrawalStatus(withdrawal.id, newStatus).subscribe({
        next: (res) => {
          console.log('🟢 อัปเดตสถานะสำเร็จ:', res);
          alert(`อัปเดตสถานะเป็น ${newStatus} สำเร็จ`);
        },
        error: (err) => {
          console.error('🔴 อัปเดตล้มเหลว:', err);
          withdrawal.status = oldStatus;
          this.cdr.detectChanges();
          alert('อัปเดตสถานะล้มเหลว');
        }
      });
    }
  }

  deleteWithdrawal(withdrawal: Withdrawal) {
    if (confirm(`⚠️ ลบคำขอถอนเงิน ${withdrawal.amount} บาท ของ ${withdrawal.username}?`)) {
      this.adminService.deleteWithdrawal(withdrawal.id).subscribe({
        next: () => {
          this.withdrawals = this.withdrawals.filter(w => w.id !== withdrawal.id);
          this.cdr.detectChanges();
          alert('ลบคำขอถอนเงินสำเร็จ');
        },
        error: (err) => {
          console.error('🔴 ลบล้มเหลว:', err);
          alert('ลบคำขอถอนเงินล้มเหลว');
        }
      });
    }
  }

  // ======================= UTILS =======================
  changeTab(tab: 'users' | 'novels' | 'withdrawals') {
    this.activeTab = tab;
    
    switch(tab) {
      case 'users':
        this.loadUsers();
        break;
      case 'novels':
        if (this.novels.length === 0) this.loadNovels();
        break;
      case 'withdrawals':
        if (this.withdrawals.length === 0) this.loadWithdrawals();
        break;
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  formatNumber(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }
}