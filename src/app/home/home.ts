import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../service/user.service'; 
import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
interface Novel {
  id: number;
  title: string;
  pen_name: string;
  description: string;
  cover_path: string | null;
  genres: any[];
  tags?: any[];
  updated_at?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {

  currentUser: any = null;

  search = '';
  profileOpen = false;
  scrolled = false;
  searchDone = false;
  searchResults: Novel[] = [];

  categories = ['ทั้งหมด', 'อัปเดตใหม่', 'กำลังฮิต', 'จบแล้ว'];
  selectedCat = 'ทั้งหมด';

  selectedGenre = '';
  selectedTag = '';

  allGenres: string[] = [];
  allTags: string[] = ['แฟนตาซี', 'วายุ', 'โรแมนติก', 'แอ็กชัน', 'ลึกลับ', 'ซึ้ง', 'GL', 'ไซไฟ', 'ตลก', 'สยองขวัญ'];

  books: Novel[] = [];
  apiUrl = 'http://localhost:3000/api/v1';

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
        console.log('Current user:', this.currentUser);
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.log('ยังไม่ได้เข้าสู่ระบบ หรือ Token หมดอายุ', err);
        this.cdr.detectChanges();
      }
    });
    
    this.http.get<any[]>(`${this.apiUrl}/novels`).subscribe({
      next: (novels) => {
        const requests = novels.map(novel => 
          this.http.get(`${this.apiUrl}/novels/${novel.id}`)
        );
        
        forkJoin(requests).subscribe((fullNovels: any[]) => {
          this.books = fullNovels;
          console.log('Books with genres:', this.books[0]?.genres);
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Error:', err)
    });
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
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
      case 'อัปเดตใหม่':
        result = [...result].sort((a, b) => 
          new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
        );
        break;
      default:
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
  }

  filterByGenre(genre: string) {
    this.selectedGenre = this.selectedGenre === genre ? '' : genre;
    console.log('Selected genre:', this.selectedGenre);
  }

  filterByTag(tag: string) {
    this.selectedTag = this.selectedTag === tag ? '' : tag;
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