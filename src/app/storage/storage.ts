import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../service/user.service';

interface StorageItem {
  novelId: number;
  title: string;
  pen_name: string;
  cover_path: string;
  genres: any[];
  lastRead?: Date;
  lastChapter?: number;
  progress?: number;
  likedAt?: Date;
  purchasedAt?: Date;
}

@Component({
  selector: 'app-storage',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './storage.html',
})
export class StorageComponent implements OnInit {

  selectedTab = 'recent';
  loading = true;
  
  recentReads: StorageItem[] = [
    {
      novelId: 1,
      title: 'กระดาษคำตอบของนายชูเกียรติ',
      pen_name: 'Gimmenoto',
      cover_path: 'http://localhost:9000/novels-bucket/covers/1.png',
      genres: [{id:1,name:'romance'},{id:5,name:'fantasy'}],
      lastRead: new Date('2024-01-15'),
      lastChapter: 5,
      progress: 45
    }
  ];

  followedNovels: StorageItem[] = [];
  likedChapters: StorageItem[] = [];
  purchasedNovels: StorageItem[] = [];

  tabs = [
    { key: 'recent', icon: '🕐', label: 'อ่านล่าสุด', count: 0 },
    { key: 'follow', icon: '🔔', label: 'ติดตาม', count: 0 },
    { key: 'liked', icon: '❤️', label: 'ตอนที่ชื่นชอบ', count: 0 },
    { key: 'purchased', icon: '💰', label: 'ซื้อไว้', count: 0 },
  ];

  scrolled = false;
  profileOpen = false;
  currentUser: any = null;

  constructor(
    private router: Router,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.userService.loadProfile();
    this.userService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.cdr.detectChanges();
    });
    
    this.loadStorageData();
  }

  loadStorageData() {
    // TODO: เรียก API จริง
    this.updateCounts();
    this.loading = false;
    this.cdr.detectChanges();
  }

  updateCounts() {
    this.tabs = [
      { key: 'recent', icon: '🕐', label: 'อ่านล่าสุด', count: this.recentReads.length },
      { key: 'follow', icon: '🔔', label: 'ติดตาม', count: this.followedNovels.length },
      { key: 'liked', icon: '❤️', label: 'ตอนที่ชื่นชอบ', count: this.likedChapters.length },
      { key: 'purchased', icon: '💰', label: 'ซื้อไว้', count: this.purchasedNovels.length },
    ];
  }

  get filteredItems(): StorageItem[] {
    switch(this.selectedTab) {
      case 'recent': return this.recentReads;
      case 'follow': return this.followedNovels;
      case 'liked': return this.likedChapters;
      case 'purchased': return this.purchasedNovels;
      default: return [];
    }
  }

  goHome() {
    this.router.navigate(['/']);
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
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
}