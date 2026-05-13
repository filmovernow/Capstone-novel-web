import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../service/user.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface StorageItem {
  novelId: number;
  title: string;
  pen_name: string;
  cover_path: string;
  genres: any[];
  lastRead?: Date;
  lastChapter?: number;
  progress?: number;
}

@Component({
  selector: 'app-storage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './storage.html',
})
export class StorageComponent implements OnInit {

  selectedTab = 'recent';
  loading = true;
  
  recentReads: StorageItem[] = [];
  followedNovels: StorageItem[] = [];

  tabs = [
    { key: 'recent', icon: '🕐', label: 'อ่านล่าสุด', count: 0 },
    { key: 'follow', icon: '🔔', label: 'ติดตาม', count: 0 },
  ];

  currentUser: any = null;

  // Navbar properties (เอา search ออก)
  profileOpen = false;
  scrolled = false;

  private API_URL = 'http://localhost:3000/api/v1';
  private isLoadingData = false;

  constructor(
    private router: Router,
    private userService: UserService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  getName(genre: any): string {
    if (!genre) return 'อื่นๆ';
    if (typeof genre === 'string') return genre;
    if (genre.name) return genre.name;
    return 'อื่นๆ';
  }

  formatNumber(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }

  ngOnInit() {
    this.userService.loadProfile();
    this.userService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.cdr.detectChanges();
    });
    
    const needRefresh = localStorage.getItem('refreshStorageData');
    if (needRefresh === 'true') {
      localStorage.removeItem('refreshStorageData');
      this.refreshData();
    } else {
      this.loadStorageData();
    }
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  async loadStorageData() {
    if (this.isLoadingData) return;
    
    this.isLoadingData = true;
    this.loading = true;
    
    try {
      await Promise.all([
        this.loadRecentReads(),
        this.loadFollowedNovels()
      ]);
      
      this.updateCounts();
    } catch (error) {
      console.error('โหลดข้อมูลคลังล้มเหลว:', error);
    } finally {
      this.loading = false;
      this.isLoadingData = false;
      this.cdr.detectChanges();
    }
  }

  async loadRecentReads() {
    try {
      const data = await firstValueFrom(
        this.http.get<any>(`${this.API_URL}/reading_histories`, {
          headers: this.getHeaders()
        })
      );
      
      const sorted = (data.reading_histories || [])
        .map((h: any) => ({
          novelId: h.novel_id,
          title: h.novel_title,
          pen_name: h.pen_name,
          cover_path: h.cover_path,
          genres: h.genres || [],
          lastRead: new Date(h.last_read_at),
          lastChapter: h.chapter_no,
          progress: 0
        }))
        .sort((a: StorageItem, b: StorageItem) => {
          if (!a.lastRead || !b.lastRead) return 0;
          return b.lastRead.getTime() - a.lastRead.getTime();
        });
      
      this.recentReads = sorted;
      
    } catch (error) {
      console.error('loadRecentReads error:', error);
      this.recentReads = [];
    }
  }
  
  async loadFollowedNovels() {
    try {
      const data = await firstValueFrom(
        this.http.get<any>(`${this.API_URL}/novels/following`, {
          headers: this.getHeaders()
        })
      );
      
      this.followedNovels = (data.followed_novels || []).map((n: any) => ({
        novelId: n.id,
        title: n.title,
        pen_name: n.pen_name,
        cover_path: n.cover_path,
        genres: n.genres || []
      }));
    } catch (error) {
      console.error('loadFollowedNovels error:', error);
      this.followedNovels = [];
    }
  }

  async refreshData() {
    console.log('🔄 Refreshing storage data...');
    await Promise.all([
      this.loadRecentReads(),
      this.loadFollowedNovels()
    ]);
    this.updateCounts();
    this.cdr.detectChanges();
  }
  
  updateCounts() {
    this.tabs = [
      { key: 'recent', icon: '🕐', label: 'อ่านล่าสุด', count: this.recentReads.length },
      { key: 'follow', icon: '🔔', label: 'ติดตาม', count: this.followedNovels.length },
    ];
  }

  get filteredItems(): any[] {
    switch(this.selectedTab) {
      case 'recent': return this.recentReads;
      case 'follow': return this.followedNovels;
      default: return [];
    }
  }

  // ✅ เพิ่ม method สำหรับจัดการ error การโหลดรูป
  onImageError(item: any) {
    item.cover_path = null;
    this.cdr.detectChanges();
  }

  // ========== NAVBAR METHODS ==========
  goHome() {
    this.router.navigate(['/']);
  }

  goToTopup() {
    this.router.navigate(['/topup']);
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  navigateTo(path: string) {
    this.profileOpen = false;
    this.router.navigate([path]);
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

  goToReader(novelId: number) {
    this.router.navigate(['/read', novelId]);
  }

  // ========== HOST LISTENERS ==========
  @HostListener('window:scroll', [])
  onScroll() {
    this.scrolled = window.scrollY > 5;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('#profile-wrapper')) {
      this.profileOpen = false;
    }
  }
}