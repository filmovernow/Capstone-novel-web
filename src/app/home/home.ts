// home.ts
import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../service/user.service'; 
import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NumberPipe } from './number.pipe';
import { NavbarComponent } from '../components/navbar/navbar';

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
  imports: [CommonModule, FormsModule, RouterLink, NumberPipe, NavbarComponent],
  templateUrl: './home.html',
})
export class Home implements OnInit {

  currentUser: any = null;

  search = '';
  profileOpen = false;
  scrolled = false;
  searchDone = false;
  searchResults: Novel[] = [];

  categories = ['แนะนำ', 'อัปเดตล่าสุด', 'กำลังฮิต'];
  selectedCat = 'แนะนำ';
  showAllBooks = false;

  // Modal properties
  showAllBooksModal = false;
  modalSearch = '';
  modalBooks: Novel[] = [];

  selectedGenre = '';
  selectedTag = '';

  allGenres: string[] = [];
  allTags: string[] = ['แฟนตาซี', 'วายุ', 'โรแมนติก', 'แอ็กชัน', 'ลึกลับ', 'ซึ้ง', 'GL', 'ไซไฟ', 'ตลก', 'สยองขวัญ'];

  books: Novel[] = [];
  featuredNovel: Novel | null = null;
  apiUrl = 'http://localhost:3000/api/v1';

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

  // ✅ ตัดข้อความ
  truncateTextByLines(text: string, maxLines: number = 3): string {
    if (!text) return 'ไม่มีคำอธิบาย';
    
    // 估算: 1 บรรทัด ~ 50-60 ตัวอักษร (ขึ้นอยู่กับความกว้าง)
    const estimatedCharsPerLine = 55;
    const maxChars = maxLines * estimatedCharsPerLine;
    
    if (text.length <= maxChars) return text;
    
    // ตัดที่คำเต็มๆ
    const truncated = text.substring(0, maxChars);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...';
  }

  get displayBooks() {
    if (this.showAllBooks) {
      return this.filteredBooks;
    }
    return this.filteredBooks.slice(0, 12);
  }

  // Modal methods
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
    console.log('Opening modal...');
    this.modalBooks = [...this.filteredBooks];
    console.log('Modal books count:', this.modalBooks.length);
    this.modalSearch = '';
    this.showAllBooksModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeAllBooksModal() {
    this.showAllBooksModal = false;
    this.modalSearch = '';
    document.body.style.overflow = '';
  }

  onModalSearch() {
    // auto filter via getter
  }

  onNavbarSearch(searchTerm: string) {
    this.search = searchTerm;
    this.onSearch();
  }

  goToWriter() {
    this.router.navigate(['/writer']);
  }
  
  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
  }

  get filteredBooks() {
    let result = [...this.books];

    // กรองตามแนว
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
    
    // เรียงลำดับตามหมวดหมู่ที่เลือก
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

  goHome() {
    this.router.navigate(['/']);
  }
  
  toggleProfile() {
    this.profileOpen = !this.profileOpen;
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
    console.log('Selected genre:', this.selectedGenre);
  }

  filterByTag(tag: string) {
    this.selectedTag = this.selectedTag === tag ? '' : tag;
    this.showAllBooks = false;
    console.log('Selected tag:', this.selectedTag);
  }

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