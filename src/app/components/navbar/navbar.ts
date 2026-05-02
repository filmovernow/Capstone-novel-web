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

  @Output() searchEvent = new EventEmitter<string>(); // ✅ ส่งค่าการค้นหากลับไปให้หน้า home

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

  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
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
      this.searchEvent.emit(''); // ✅ ส่งค่าว่างกลับไป
      return;
    }
    this.searchResults = this.books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.pen_name || '').toLowerCase().includes(q)
    ).slice(0, 5);
    this.searchDone = true;
    this.searchEvent.emit(this.search); // ✅ ส่งค่าค้นหากลับไป
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