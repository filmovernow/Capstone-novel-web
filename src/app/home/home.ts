import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../service/user.service'; 
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
  like_count?: number;
  status?: 'draft' | 'published' | 'writing';
  rating?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit {

  currentUser: any = null;

  // Search
  search = '';
  searchDone = false;
  searchResults: Novel[] = [];

  // Navbar states
  profileOpen = false;
  scrolled = false;

  // Category
  categories = ['แนะนำ', 'อัปเดตล่าสุด', 'กำลังฮิต'];
  selectedCat = 'แนะนำ';
  showAllBooks = false;

  // Modal
  showAllBooksModal = false;
  modalSearch = '';
  modalBooks: Novel[] = [];

  // Filters
  selectedGenre = '';
  selectedTag = '';

  allGenres: string[] = [];
  allTags: string[] = ['แฟนตาซี', 'วายุ', 'โรแมนติก', 'แอ็กชัน', 'ลึกลับ', 'ซึ้ง', 'GL', 'ไซไฟ', 'ตลก', 'สยองขวัญ'];

  // Data
  books: Novel[] = [];
  featuredNovel: Novel | null = null;
  apiUrl = 'http://localhost:3000/api/v1';
  baseUrl = 'http://localhost:3000';

  constructor(
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.userService.loadProfile();
    
    this.userService.currentUser$.subscribe(user => {
      if (!user) return;
      
      if (user.avatar_path) {
        if (!user.avatar_path.includes('?t=')) {
          user.avatar_path = `${user.avatar_path}?t=${Date.now()}`;
        }
      }
      
      this.currentUser = user;
      this.cdr.detectChanges();
    });
    
    this.http.get<{genres: string[]}>(`${this.apiUrl}/novels/genres`).subscribe({
      next: (res) => {
        this.allGenres = res.genres;
      },
      error: (err) => console.error('Error loading genres:', err)
    });
    
    this.loadNovels();
  }

  loadNovels() {
    this.http.get<any[]>(`${this.apiUrl}/novels`).subscribe({
      next: (novels) => {
        this.books = novels.filter(novel => novel.status === 'published');
        console.log('Books loaded:', this.books);
        this.loadFeaturedNovel();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error:', err)
    });
  }

  loadFeaturedNovel() {
    const publishedNovels = this.books.filter(novel => novel.status === 'published');
    
    if (publishedNovels.length > 0) {
      const randomIndex = Math.floor(Math.random() * publishedNovels.length);
      this.featuredNovel = publishedNovels[randomIndex];
    } else {
      this.setFallbackFeatured();
    }
    this.cdr.detectChanges();
  }

  setFallbackFeatured() {
    this.featuredNovel = {
      id: 1,
      title: 'ราชันย์แห่งดวงดาว',
      pen_name: 'นักเขียนดาวรุ่ง',
      description: 'เมื่อเจ้าหญิงผู้ถูกลืมได้พบกับราชันย์ผู้ครองจักรวาล ชะตากรรมของสองโลกจึงพัวพันกันอย่างหลีกเลี่ยงไม่ได้...',
      cover_path: null,
      view_count: 210000,
      like_count: 15234,
      updated_at: new Date().toISOString(),
      genres: [{ name: 'แฟนตาซี' }, { name: 'โรแมนติก' }, { name: 'ระทึก' }],
      status: 'published',
      rating: 4.9
    };
  }

  formatNumber(value: number): string {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }

  // ========== NAVBAR METHODS ==========
  isValidCoverUrl(coverPath: string | null): boolean {
    if (!coverPath) return false;
    return coverPath.startsWith('http') || 
           coverPath.includes('.jpg') || 
           coverPath.includes('.png') || 
           coverPath.includes('.jpeg') || 
           coverPath.includes('.gif') ||
           coverPath.includes('.webp') ||
           coverPath.startsWith('/');
  }

  getFullCoverUrl(coverPath: string | null): string {
    if (!coverPath) return '';
    if (coverPath.startsWith('http://') || coverPath.startsWith('https://')) {
      return coverPath;
    }
    if (coverPath.startsWith('/')) {
      return `${this.baseUrl}${coverPath}`;
    }
    return `${this.baseUrl}/uploads/${coverPath}`;
  }

  onImageError(book: Novel) {
    book.cover_path = null;
    this.cdr.detectChanges();
  }

  getCoverEmoji(coverPath: string | null): string {
    if (!coverPath) return '📖';
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    if (emojiRegex.test(coverPath) && coverPath.length <= 4) {
      return coverPath;
    }
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

  navigateTo(path: string) {
    this.profileOpen = false;
    this.router.navigate([path]);
  }

  goToTopup() {
    this.router.navigate(['/topup']);
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  goHome() {
    this.router.navigate(['/']);
  }

  // ========== SEARCH METHODS ==========
  onSearch() {
    const q = this.search.trim().toLowerCase();
    
    if (!q) {
      this.searchResults = [];
      this.searchDone = false;
      return;
    }
    
    this.searchResults = this.books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.pen_name || '').toLowerCase().includes(q)
    ).slice(0, 5);
    
    this.searchDone = true;
  }

  // ========== FILTER METHODS ==========
  get displayBooks() {
    if (this.showAllBooks) {
      return this.filteredBooks;
    }
    return this.filteredBooks.slice(0, 12);
  }

  get filteredBooks() {
    let result = [...this.books];

    if (this.selectedGenre) {
      result = result.filter(book => 
        book.genres?.some((g: any) => 
          (g.name || g).toLowerCase() === this.selectedGenre.toLowerCase()
        )
      );
    }
    
    if (this.selectedTag) {
      result = result.filter(book => 
        book.genres?.some((g: any) => 
          (g.name || g).toLowerCase() === this.selectedTag.toLowerCase()
        )
      );
    }
    
    switch(this.selectedCat) {
      case 'แนะนำ':
        result = [...result].sort((a, b) => b.id - a.id);
        break;
      case 'อัปเดตล่าสุด':
        result = [...result].sort((a, b) => 
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );
        break;
      case 'กำลังฮิต':
        result = [...result].sort((a, b) => 
          (b.view_count || 0) - (a.view_count || 0)
        );
        break;
      default:
        result = [...result].sort((a, b) => b.id - a.id);
        break;
    }
    
    return result;
  }

  setCategory(cat: string) {
    this.selectedCat = cat;
    this.selectedGenre = '';
    this.selectedTag = '';
    this.showAllBooks = false;
  }

  filterByGenre(genre: string) {
    this.selectedGenre = this.selectedGenre === genre ? '' : genre;
    this.showAllBooks = false;
  }

  filterByTag(tag: string) {
    this.selectedTag = this.selectedTag === tag ? '' : tag;
    this.showAllBooks = false;
  }

  // ========== MODAL METHODS ==========
  get modalFilteredBooks() {
    if (!this.modalSearch.trim()) {
      return this.modalBooks;
    }
    const q = this.modalSearch.trim().toLowerCase();
    return this.modalBooks.filter(b =>
      b.title.toLowerCase().includes(q) ||
      (b.pen_name || '').toLowerCase().includes(q)
    );
  }

  openAllBooksModal() {
    this.modalBooks = [...this.filteredBooks];
    this.modalSearch = '';
    this.showAllBooksModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeAllBooksModal() {
    this.showAllBooksModal = false;
    this.modalSearch = '';
    document.body.style.overflow = '';
  }

  onModalSearch() {}

  // ========== OTHER ==========
  goToWriter() {
    this.router.navigate(['/writer']);
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