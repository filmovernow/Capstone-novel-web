import { Component, HostListener, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../../service/user.service';
import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Novel {
  id: number;
  title: string;
  pen_name: string;
  description: string;
  cover_path: string | null;
  genres: any[];
  tags?: any[];
  updated_at?: string;
  view_count?: number;
  status?: 'draft' | 'published' | 'writing';
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './navbar.html',
})
export class NavbarComponent implements OnInit {

  currentUser: any = null;
  search = '';
  profileOpen = false;
  scrolled = false;
  searchDone = false;
  searchResults: Novel[] = [];
  
  books: Novel[] = [];
  apiUrl = 'http://localhost:3000/api/v1';
  baseUrl = 'http://localhost:3000';

  @Output() searchEvent = new EventEmitter<string>();

  constructor(
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.userService.loadProfile();
    
    this.userService.currentUser$.subscribe({
      next: (user: any) => {
        this.currentUser = user;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentUser = null;
        this.cdr.detectChanges();
      }
    });
    
    // โหลดนิยายทั้งหมดสำหรับการค้นหา
    this.http.get<any[]>(`${this.apiUrl}/novels`).subscribe({
      next: (novels) => {
        this.books = novels.filter(novel => novel.status === 'published');
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error:', err)
    });
  }
  
  // ฟังก์ชันตรวจสอบว่าเป็น URL ที่ใช้งานได้หรือไม่
  isValidCoverUrl(coverPath: string | null): boolean {
    if (!coverPath) return false;
    // เช็คว่าเป็น http URL หรือมีนามสกุลไฟล์รูป หรือมี slash
    return coverPath.startsWith('http') || 
           coverPath.includes('.jpg') || 
           coverPath.includes('.png') || 
           coverPath.includes('.jpeg') || 
           coverPath.includes('.gif') ||
           coverPath.includes('.webp') ||
           coverPath.startsWith('/');
  }
  
  // ฟังก์ชันสร้าง URL รูปแบบเต็ม
  getFullCoverUrl(coverPath: string | null): string {
    if (!coverPath) return '';
    
    // ถ้าเป็น URL เต็มแล้ว
    if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
      return coverPath;
    }
    
    // ถ้าขึ้นต้นด้วย / (relative path)
    if (coverPath.startsWith('/')) {
      return `${this.baseUrl}${coverPath}`;
    }
    
    // ถ้าเป็นแค่ชื่อไฟล์
    return `${this.baseUrl}/uploads/${coverPath}`;
  }
  
  // ฟังก์ชันจัดการกรณีรูปโหลดไม่สำเร็จ
  onImageError(book: Novel) {
    book.cover_path = null;
    this.cdr.detectChanges();
  }
  
  // ฟังก์ชันแสดงอีโมจิแทนรูป
  getCoverEmoji(coverPath: string | null): string {
    if (!coverPath) return '📖';
    
    // ถ้า cover_path เป็นอีโมจิโดยตรง
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    if (emojiRegex.test(coverPath) && coverPath.length <= 4) {
      return coverPath;
    }
    
    // ถ้ามีข้อความสั้นๆ อาจเป็นอีโมจิ
    if (coverPath.length <= 3) {
      return coverPath;
    }
    
    return '📖';
  }
  
  navigateToAdmin() {
    this.profileOpen = false;
    this.router.navigate(['/admin/dashboard']);
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin' || this.currentUser?.username === 'admin';
  }
  
  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
  }

  navigateTo(path: string) {
    this.profileOpen = false;
    this.router.navigate([path]);
  }

  goHome() {
    this.router.navigate(['/']);
  }
  
  goToTopup() {
    this.router.navigate(['/topup']);
  }
  
  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  onSearch() {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      this.searchResults = [];
      this.searchDone = false;
      this.searchEvent.emit('');
      return;
    }
    this.searchResults = this.books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.pen_name || '').toLowerCase().includes(q)
    ).slice(0, 5);
    this.searchDone = true;
    this.searchEvent.emit(this.search);
  }
  
  clearSearch() {
    this.search = '';
    this.searchResults = [];
    this.searchDone = false;
    this.searchEvent.emit('');
  }

  @HostListener('window:scroll', [])
  onScroll() {
    this.scrolled = window.scrollY > 300;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('#profile-wrapper')) {
      this.profileOpen = false;
    }
  }
  
  formatNumber(value: number): string {
    if (value === undefined || value === null) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }
}