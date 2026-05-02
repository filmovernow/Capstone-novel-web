import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../service/user.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NavbarComponent } from '../components/navbar/navbar';

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
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './storage.html',
})
export class StorageComponent implements OnInit {

  selectedTab = 'recent';
  loading = true;
  
  recentReads: StorageItem[] = [];
  followedNovels: StorageItem[] = [];
  // ❌ ลบ likedChapters: LikedChapterItem[] = [];

  tabs = [
    { key: 'recent', icon: '🕐', label: 'อ่านล่าสุด', count: 0 },
    { key: 'follow', icon: '🔔', label: 'ติดตาม', count: 0 },
  ];

  currentUser: any = null;

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
      Authorization: token || ''
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


  goHome() {
    this.router.navigate(['/']);
  }

  goToReader(novelId: number) {
    this.router.navigate(['/read', novelId]);
  }
  
  onNavbarSearch(searchTerm: string) {
    if (searchTerm) {
      this.router.navigate(['/'], { queryParams: { search: searchTerm } });
    }
  }
}