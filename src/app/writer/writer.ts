import { Component, OnInit, ChangeDetectorRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserService } from '../service/user.service';
import { filter, Subscription } from 'rxjs';

interface Novel {
  id: number;
  title: string;
  description: string;
  pen_name: string;
  cover_path: string | null;
  status: 'draft' | 'published' | 'writing';
  chapters_count: number;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
  genres: any[];
}

@Component({
  selector: 'app-writer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './writer.html',
})
export class WriterComponent implements OnInit, OnDestroy {

  selectedTab = 'all';
  novels: Novel[] = [];
  loading = true;
  apiUrl = 'http://localhost:3000/api/v1';

  scrolled = false;
  profileOpen = false;
  currentUser: any = null;

  tabs = [
    { key: 'all',       icon: '📚', label: 'ทั้งหมด',     count: 0 },
    { key: 'writing',   icon: '✏️',  label: 'กำลังเขียน',  count: 0 },
    { key: 'published', icon: '🌟', label: 'เผยแพร่แล้ว', count: 0 },
    { key: 'draft',     icon: '📝', label: 'แบบร่าง',      count: 0 },
  ];

  stats = [
    { icon: '📖', value: '0', label: 'นิยายทั้งหมด' },
    { icon: '👁',  value: '0', label: 'ยอดวิวรวม' },
    { icon: '❤️', value: '0', label: 'ยอดถูกใจรวม' },
    { icon: '✍️', value: '0', label: 'ตอนที่เขียนแล้ว' },
  ];

  private userSubscription: Subscription | null = null;
  private refreshInterval: any = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.userService.loadProfile();
    this.userSubscription = this.userService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentUser = null;
      }
    });
    
    this.fetchMyNovels();
    
    // ✅ auto-refresh ทุก 30 วินาที
    this.refreshInterval = setInterval(() => {
      if (this.router.url.includes('/writer')) {
        this.fetchMyNovels();
      }
    }, 30000);
    
    // ✅ refresh เมื่อกลับมาหน้านี้
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd && event.url === '/writer') {
        this.refreshData();
      }
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  formatNumber(value: number): string {
    if (value === undefined || value === null) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }

  refreshData() {
    this.fetchMyNovels();
    this.userService.loadProfile();
    this.cdr.detectChanges();
  }

  fetchMyNovels() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth']);
      return;
    }

    this.loading = true;
    
    this.http.get<any[]>(`${this.apiUrl}/novels/my_novels`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          this.novels = res.map(novel => ({
            id: novel.id,
            title: novel.title,
            description: novel.description || '',
            pen_name: novel.pen_name,
            cover_path: novel.cover_path,
            status: novel.status || 'draft',
            chapters_count: novel.chapters_count || 0,
            views: novel.views || 0,
            likes: novel.likes || 0,
            created_at: novel.created_at,
            updated_at: novel.updated_at,
            genres: novel.genres || []
          }));
          
          this.updateCounts();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching novels:', err);
          this.loading = false;
          this.cdr.detectChanges();
          
          if (err.status === 401) {
            localStorage.removeItem('token');
            this.router.navigate(['/auth']);
          }
        }
      });
  }

  updateCounts() {
    const writing = this.novels.filter(n => n.status === 'writing').length;
    const published = this.novels.filter(n => n.status === 'published').length;
    const draft = this.novels.filter(n => n.status === 'draft').length;
    
    this.tabs = [
      { key: 'all', icon: '📚', label: 'ทั้งหมด', count: this.novels.length },
      { key: 'writing', icon: '✏️', label: 'กำลังเขียน', count: writing },
      { key: 'published', icon: '🌟', label: 'เผยแพร่แล้ว', count: published },
      { key: 'draft', icon: '📝', label: 'แบบร่าง', count: draft },
    ];

    const totalViews = this.novels.reduce((sum, n) => sum + (n.views || 0), 0);
    const totalLikes = this.novels.reduce((sum, n) => sum + (n.likes || 0), 0);
    const totalChapters = this.novels.reduce((sum, n) => sum + (n.chapters_count || 0), 0);

    this.stats = [
      { icon: '📖', value: this.formatNumber(this.novels.length), label: 'นิยายทั้งหมด' },
      { icon: '👁', value: this.formatNumber(totalViews), label: 'ยอดวิวรวม' },
      { icon: '❤️', value: this.formatNumber(totalLikes), label: 'ยอดถูกใจรวม' },
      { icon: '✍️', value: this.formatNumber(totalChapters), label: 'ตอนที่เขียนแล้ว' },
    ];
  }

  get filteredNovels(): Novel[] {
    if (this.selectedTab === 'all') return this.novels;
    return this.novels.filter(n => n.status === this.selectedTab);
  }

  getStatusLabel(status: string): string {
    switch(status) {
      case 'published': return '🌟 เผยแพร่แล้ว';
      case 'writing': return '✏️ กำลังเขียน';
      default: return '📝 แบบร่าง';
    }
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'published': return 'bg-[#72f5c8] text-[#0a2e22]';
      case 'writing': return 'bg-[#D4ADFC] text-[#0C134F]';
      default: return 'bg-[#7B6FA0] text-white';
    }
  }

  getBgClass(index: number): string {
    const bgs = ['from-[#1D267D] to-[#5C469C]', 'from-[#3d1a6e] to-[#1D267D]', 'from-[#5C469C] to-[#1D267D]', 'from-[#1a0a3d] to-[#5C469C]'];
    return bgs[index % bgs.length];
  }

  goHome() {
    this.router.navigate(['/']);
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
    this.cdr.detectChanges();
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
  }

  deleteNovel(id: number) {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบนิยายเรื่องนี้?')) {
      this.http.delete(`${this.apiUrl}/novels/${id}`, { headers: this.getHeaders() })
        .subscribe({
          next: () => {
            this.refreshData();
          },
          error: (err) => {
            console.error('Error deleting novel:', err);
            alert('ลบไม่สำเร็จ: ' + (err.error?.error || 'เกิดข้อผิดพลาด'));
          }
        });
    }
  }

  editNovel(id: number) {
    this.router.navigate(['/writer/create'], { queryParams: { novelId: id } });
  }

  addChapter(id: number) {
    this.router.navigate(['/writer/create'], { queryParams: { novelId: id } });
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
      this.cdr.detectChanges();
    }
  }
}