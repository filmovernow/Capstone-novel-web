import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { UserService } from '../service/user.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Chapter {
  id: number;
  chapter_no: number;
  title: string;
  isDisabled?: boolean;
}

@Component({
  selector: 'app-novel-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './novel-reader.html'
})

export class NovelReaderComponent {
  activeChapterId = 0;
  fontSize = 16;
  newComment = '';

  apiUrl = 'http://localhost:3000/api/v1';
  novelId!: number;
  token = localStorage.getItem('token');
  currentContent = '';
  safeContent: SafeHtml = '';
  novelDescription = '';
  authorName = '';
  coverPath = '';
  genres: string[] = [];

  chapters: Chapter[] = [];
  currentUser: any = null;
  profileOpen = false;
  novelTitle = '';

  constructor(
    private http: HttpClient, 
    private route: ActivatedRoute, 
    private cdr: ChangeDetectorRef, 
    private userService: UserService,
    private sanitizer: DomSanitizer,
    private router: Router
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

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.novelId = Number(id);
      this.fetchNovelAndChapters();
    });
  }

  getHeaders() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token}`
    });
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  fetchNovelAndChapters() {
    this.http.get<any>(`${this.apiUrl}/novels/${this.novelId}`)
      .subscribe(novel => {
        this.novelDescription = novel.description || '';
        this.novelTitle = novel.title || '';
        this.authorName = novel.pen_name || 'ไม่ทราบผู้แต่ง';
        this.coverPath = novel.cover_path || '';
        this.genres = novel.genres || [];

        const options = this.token ? { headers: this.getHeaders() } : {};

        this.http.get<any[]>(`${this.apiUrl}/novels/${this.novelId}/chapters`, options)
          .subscribe(res => {
            console.log('Chapters from API:', res);
            
            const mappedChapters: Chapter[] = res.map(ch => ({
              id: ch.chapter_no,
              chapter_no: ch.chapter_no,
              title: ch.title || `ตอนที่ ${ch.chapter_no}`,
              isDisabled: false
            }));

            mappedChapters.sort((a, b) => a.chapter_no - b.chapter_no);

            this.chapters = [
              { id: 0, chapter_no: 0, title: 'บทนำ', isDisabled: false },
              ...mappedChapters
            ];
            
            console.log('All chapters with intro:', this.chapters);
            
            this.setActiveChapter(0);
          });
      });
  }

  loadChapter(id: number) {
    console.log('Loading chapter id:', id);
    
    if (id === 0) {
      this.currentContent = this.novelDescription || 'ยังไม่มีเกริ่นนำ';
      this.safeContent = this.sanitizer.bypassSecurityTrustHtml(this.currentContent);
      this.cdr.detectChanges();
      return;
    }
    
    const chapter = this.chapters.find(c => c.id === id);
    if (!chapter) {
      console.log('Chapter not found');
      return;
    }

    const chapterNo = chapter.chapter_no;
    console.log('Chapter number:', chapterNo);

    this.http.get<any>(`${this.apiUrl}/novels/${this.novelId}/chapters/${chapterNo}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res) => {
        console.log('Chapter content loaded:', res);
        const rawContent = res.content || 'ไม่มีเนื้อหา';
        this.currentContent = rawContent;
        this.safeContent = this.sanitizer.bypassSecurityTrustHtml(rawContent);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading chapter:', err);
        this.currentContent = 'ไม่สามารถโหลดเนื้อหาได้';
        this.safeContent = this.sanitizer.bypassSecurityTrustHtml('ไม่สามารถโหลดเนื้อหาได้');
        this.cdr.detectChanges();
      }
    });
  }

  get currentChapter() {
    return this.chapters.find(c => c.id === this.activeChapterId);
  }

  get progressPercent() {
    const index = this.chapters.findIndex(c => c.id === this.activeChapterId);
    if (this.chapters.length <= 1) return 100;
    return (index / (this.chapters.length - 1)) * 100;
  }

  changeFontSize(delta: number) {
    this.fontSize = Math.min(Math.max(this.fontSize + delta, 12), 30);
  }

  setActiveChapter(id: number) {
    const chapter = this.chapters.find(c => c.id === id);
    if (chapter && !chapter.isDisabled) {
      this.activeChapterId = id;
      this.loadChapter(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextChapter() {
    const currentIndex = this.chapters.findIndex(c => c.id === this.activeChapterId);
    if (currentIndex < this.chapters.length - 1) {
      this.setActiveChapter(this.chapters[currentIndex + 1].id);
    }
  }

  prevChapter() {
    const currentIndex = this.chapters.findIndex(c => c.id === this.activeChapterId);
    if (currentIndex > 0) {
      this.setActiveChapter(this.chapters[currentIndex - 1].id);
    }
  }

  get wordCount() {
    if (!this.currentContent) return 0;
    const stripped = this.currentContent.replace(/<[^>]*>/g, '');
    return stripped.length;
  }
}