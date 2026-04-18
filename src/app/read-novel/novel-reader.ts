import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { UserService } from '../service/user.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

interface Chapter {
  id: number;
  chapter_no: number;
  title: string;
  isDisabled?: boolean;
  content?: string;
  like_count?: number;
  is_liked?: boolean;
}

@Component({
  selector: 'app-novel-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './novel-reader.html'
})

export class NovelReaderComponent implements OnInit {
  activeChapterId = 0;
  fontSize = 16;
  newComment = '';

  apiUrl = 'http://localhost:3000/api/v1';
  novelId!: number;
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
  
  isFollowing = false;
  followCount = 0;
  isLiking = false;
  
  private isLoading = false;
  private storageKey = 'reading_progress';
  private currentLoadingChapterId: number | null = null;

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

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (!id) return;
      this.novelId = Number(id);
    });

    this.userService.currentUser$.subscribe({
      next: (user: any) => {
        this.currentUser = user;
        if (this.novelId && !this.isLoading) {
          this.loadAllData();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentUser = null;
        if (this.novelId && !this.isLoading) {
          this.loadAllData();
        }
        this.cdr.detectChanges();
      }
    });
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  getLastReadChapter(): number | null {
    const progress = localStorage.getItem('reading_progress');
    if (progress) {
      try {
        const data = JSON.parse(progress);
        return data[this.novelId] || null;
      } catch(e) {}
    }
    return null;
  }

  async loadAllData() {
    if (this.isLoading) return;
    this.isLoading = true;
    
    const headers = this.getHeaders();
    
    try {
      const novel: any = await firstValueFrom(
        this.http.get<any>(`${this.apiUrl}/novels/${this.novelId}`, { headers })
      );
      
      this.novelDescription = novel.description || '';
      this.novelTitle = novel.title || '';
      this.authorName = novel.pen_name || 'ไม่ทราบผู้แต่ง';
      this.coverPath = novel.cover_path || '';
      this.genres = novel.genres || [];
      this.followCount = novel.follow_count || 0;
      this.isFollowing = novel.is_followed === true;
      
      const chaptersRes: any[] = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/novels/${this.novelId}/chapters`, { headers })
      );
      
      const mappedChapters: Chapter[] = chaptersRes.map(ch => ({
        id: ch.chapter_no,
        chapter_no: ch.chapter_no,
        title: ch.title || `ตอนที่ ${ch.chapter_no}`,
        content: undefined,
        like_count: ch.like_count || 0,
        is_liked: ch.is_liked || false,
        isDisabled: false
      }));

      mappedChapters.sort((a, b) => a.chapter_no - b.chapter_no);

      this.chapters = [
        { 
          id: 0, 
          chapter_no: 0, 
          title: 'บทนำ', 
          isDisabled: false, 
          content: this.novelDescription,
          like_count: 0,
          is_liked: false
        },
        ...mappedChapters
      ];
      
      const lastChapterId = this.getLastReadChapter();
      
      if (lastChapterId !== null && this.chapters.some(c => c.id === lastChapterId)) {
        this.setActiveChapter(lastChapterId);
      } else {
        this.setActiveChapter(0);
      }
      
      this.cdr.detectChanges();
      
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      this.isLoading = false;
    }
  }

  setActiveChapter(id: number) {
    if (this.activeChapterId === id) return;
    if (this.currentLoadingChapterId === id) return;
    
    const chapter = this.chapters.find(c => c.id === id);
    if (chapter && !chapter.isDisabled) {
      this.activeChapterId = id;
      this.loadChapter(id);
      
      if (id !== 0) {
        const progress = localStorage.getItem('reading_progress');
        let data: any = {};
        if (progress) {
          try {
            data = JSON.parse(progress);
          } catch(e) {}
        }
        data[this.novelId] = id;
        localStorage.setItem('reading_progress', JSON.stringify(data));
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  loadChapter(id: number) {
    if (this.currentLoadingChapterId === id) return;
    this.currentLoadingChapterId = id;
    
    if (id === 0) {
      this.currentContent = this.novelDescription || 'ยังไม่มีเกริ่นนำ';
      this.safeContent = this.sanitizer.bypassSecurityTrustHtml(this.currentContent);
      this.currentLoadingChapterId = null;
      this.cdr.detectChanges();
      return;
    }
    
    const headers = this.getHeaders();

    this.http.get<any>(`${this.apiUrl}/novels/${this.novelId}/chapters/${id}`, { headers })
      .subscribe({
        next: (res) => {
          const rawContent = res.content || 'ไม่มีเนื้อหา';
          
          const foundChapter = this.chapters.find(c => c.id === id);
          if (foundChapter) {
            foundChapter.content = rawContent;
          }
          
          this.currentContent = rawContent;
          this.safeContent = this.sanitizer.bypassSecurityTrustHtml(rawContent);
          this.currentLoadingChapterId = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error loading chapter:', err);
          this.currentContent = 'ไม่สามารถโหลดเนื้อหาได้';
          this.safeContent = this.sanitizer.bypassSecurityTrustHtml('ไม่สามารถโหลดเนื้อหาได้');
          this.currentLoadingChapterId = null;
          this.cdr.detectChanges();
        }
      });
  }

  get currentChapter() {
    return this.chapters.find(c => c.id === this.activeChapterId);
  }

  get progressPercent() {
    if (this.chapters.length <= 1) return 100;
    const index = this.chapters.findIndex(c => c.id === this.activeChapterId);
    return (index / (this.chapters.length - 1)) * 100;
  }

  changeFontSize(delta: number) {
    this.fontSize = Math.min(Math.max(this.fontSize + delta, 12), 30);
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

  toggleLike() {
    if (!this.currentUser) {
      alert('กรุณาเข้าสู่ระบบเพื่อถูกใจตอนนี้');
      this.router.navigate(['/auth']);
      return;
    }

    if (this.isLiking) return;
    this.isLiking = true;

    const chapter = this.currentChapter;
    if (!chapter || chapter.id === 0) {
      this.isLiking = false;
      return;
    }

    const url = `${this.apiUrl}/novels/${this.novelId}/chapters/${chapter.id}/toggle_like`;

    this.http.post(url, {}, { headers: this.getHeaders() }).subscribe({
      next: (res: any) => {
        chapter.is_liked = res.liked;
        chapter.like_count = res.like_count;
        this.isLiking = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error toggling like:', err);
        this.isLiking = false;
      }
    });
  }

  toggleFollow() {
    if (!this.currentUser) {
      alert('กรุณาเข้าสู่ระบบเพื่อติดตามนิยาย');
      this.router.navigate(['/auth']);
      return;
    }

    const url = `${this.apiUrl}/novels/${this.novelId}`;

    if (this.isFollowing) {
      this.http.delete(`${url}/unfollow`, { headers: this.getHeaders() }).subscribe({
        next: (res: any) => {
          this.isFollowing = false;
          this.followCount = res.follow_count;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error unfollowing:', err)
      });
    } else {
      this.http.post(`${url}/follow`, {}, { headers: this.getHeaders() }).subscribe({
        next: (res: any) => {
          this.isFollowing = true;
          this.followCount = res.follow_count;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error following:', err)
      });
    }
  }
}