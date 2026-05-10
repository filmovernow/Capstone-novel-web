// src/app/admin/admin-dashboard.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, User, Novel } from './admin.service';
import { UserService } from '../service/user.service';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

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
  totalNovels = 0;
  loadingNovels = false;
  
  // Current User
  currentUser: any = null;
  isAdmin = false;
  
  // Tab
  activeTab: 'users' | 'novels' = 'users';
  
  // Search
  searchKeyword = '';
  
  // ✅ ลบ property deletingUserId ออก

  // ลำดับการเรียง
  sortOrder: 'asc' | 'desc' = 'desc';
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  
  apiUrl = 'http://localhost:3000/api/v1';

  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    console.log('🔵 AdminDashboardComponent ทำงานแล้ว!');
    
    this.userService.loadProfile();
    
    this.userService.currentUser$.pipe(
      filter(user => user !== null)
    ).subscribe(user => {
      console.log('🔵 user in component:', user);
      this.currentUser = user;
      
      if (user.role !== 'admin' && user.username !== 'admin') {
        console.log('⚠️ ไม่ใช่ admin! จะไม่แสดงข้อมูล');
        this.isAdmin = false;
        return;
      }
      
      this.isAdmin = true;
      
      // โหลดข้อมูลทันทีทั้งสอง tab
      this.loadUsers();
      this.loadNovels();
    });
  }

  // ======================= PAGINATION =======================
  
  get totalPages(): number {
    const total = this.activeTab === 'users' ? this.filteredUsers.length : this.filteredNovels.length;
    return Math.ceil(total / this.itemsPerPage);
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredUsers.slice(start, end);
  }

  get paginatedNovels(): Novel[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredNovels.slice(start, end);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  getPages(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }
    return pages;
  }

  // ======================= SEARCH & SORT =======================
  
  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  onSearch() {
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  clearSearch() {
    this.searchKeyword = '';
    this.currentPage = 1;
  }

  get filteredUsers(): User[] {
    if (!this.searchKeyword.trim()) {
      return this.users;
    }
    const keyword = this.searchKeyword.toLowerCase();
    return this.users.filter(user => 
      user.username.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword)
    );
  }

  get filteredNovels(): Novel[] {
    let result = this.novels;
    
    if (this.searchKeyword.trim()) {
      const keyword = this.searchKeyword.toLowerCase();
      result = this.novels.filter(novel => 
        novel.title.toLowerCase().includes(keyword) ||
        (novel.pen_name && novel.pen_name.toLowerCase().includes(keyword))
      );
    }
    
    return result.sort((a, b) => {
      if (this.sortOrder === 'desc') {
        return b.id - a.id;
      } else {
        return a.id - b.id;
      }
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
        this.currentPage = 1;
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

  // ❌ ลบ function deleteUser ออกทั้งหมด

  // ======================= NOVELS =======================
  loadNovels() {
    console.log('🟡 loadNovels() ถูกเรียก');
    this.loadingNovels = true;
    this.cdr.detectChanges();
    
    this.adminService.getNovels().subscribe({
      next: (res) => {
        console.log('🟢 โหลดนิยายสำเร็จ:', res.novels?.length);
        this.novels = res.novels || [];
        this.totalNovels = res.total || 0;
        this.loadingNovels = false;
        this.currentPage = 1;
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
          this.totalNovels = this.novels.length;
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

  // ======================= UTILS =======================
  changeTab(tab: 'users' | 'novels') {
    this.activeTab = tab;
    this.searchKeyword = '';
    this.currentPage = 1;
    this.cdr.detectChanges();
  }

  goBack() {
    this.router.navigate(['/']);
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
  }

  formatNumber(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }
}