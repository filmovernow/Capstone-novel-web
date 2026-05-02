import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { UserService } from '../service/user.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { Location } from '@angular/common';

interface Chapter {
  id: number;
  chapter_no: number;
  title: string;
  isDisabled?: boolean;
  content?: string;
  like_count?: number;
  is_liked?: boolean;
  price?: number;
}

@Component({
  selector: 'app-novel-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './novel-reader.html'
})

export class NovelReaderComponent implements OnInit, OnDestroy {
  activeChapterId = 0;
  fontSize = 16;
  newComment = '';
  previousUrl: string = '/';

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
  
  novelPrice = 0;
  hasPurchasedNovel = false;
  novelAuthorId = 0;
  showPurchaseModal = false;
  purchaseInfo: any = null;
  isPurchasing = false;
  hasAccessToNovel = false;
  isNovelOwner = false;
  
  // ✅ เพิ่มตัวแปรป้องกันการซื้อซ้ำ
  private isPurchasingNovel = false;
  
  private isLoading = false;
  private storageKey = 'reading_progress';
  private currentLoadingChapterId: number | null = null;
  private currentChapterSub: any = null;
  
  private canGoBack = false;

  constructor(
    private http: HttpClient, 
    private route: ActivatedRoute, 
    private cdr: ChangeDetectorRef, 
    private userService: UserService,
    private sanitizer: DomSanitizer,
    public  router: Router,
    private location: Location
  ) {}

  goToTopup() {
    this.router.navigate(['/topup']);
  }

  ngOnInit() {
    this.userService.loadProfile();
    this.checkHistoryBack();

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state as { previousUrl?: string };
    
    if (state?.previousUrl) {
      this.previousUrl = state.previousUrl;
    }

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
  
  formatNumber(value: number): string {
    if (value === undefined || value === null) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }
  
  private checkHistoryBack() {
    if (document.referrer && document.referrer !== '') {
      const referrerUrl = new URL(document.referrer);
      const currentUrl = new URL(window.location.href);
      
      if (referrerUrl.origin === currentUrl.origin && referrerUrl.pathname !== currentUrl.pathname) {
        this.canGoBack = true;
      }
    }
    
    if (window.history.length > 1) {
      this.canGoBack = true;
    }
  }
  
  goBack() {
    if (this.canGoBack && window.history.length > 1) {
      this.location.back();
      return;
    }
    
    if (this.previousUrl && this.previousUrl !== '/') {
      this.router.navigateByUrl(this.previousUrl);
      return;
    }
    
    this.router.navigate(['/']);
  }
  
  refreshStorage() {
    localStorage.setItem('refreshStorageData', 'true');
  }

  ngOnDestroy() {
    if (this.currentChapterSub) {
      this.currentChapterSub.unsubscribe();
    }
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
      this.novelPrice = novel.price || 0;
      this.hasPurchasedNovel = novel.has_purchased === true;
      this.novelAuthorId = novel.user_id || 0;
      this.isNovelOwner = this.currentUser && this.currentUser.id === this.novelAuthorId;
      
      this.hasAccessToNovel = this.isNovelOwner || this.hasPurchasedNovel;
      
      const isOneTimeLocked = novel.pricing_model === 'one_time' && !this.hasAccessToNovel && novel.price > 0;
      
      const chaptersRes: any[] = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/novels/${this.novelId}/chapters`, { headers })
      );
      
      const mappedChapters: Chapter[] = chaptersRes.map(ch => {
        let isDisabled = false;
        if (isOneTimeLocked && ch.chapter_no > 0) {
          isDisabled = true;
        }
        
        return {
          id: ch.chapter_no,
          chapter_no: ch.chapter_no,
          title: ch.title || `ตอนที่ ${ch.chapter_no}`,
          content: undefined,
          like_count: 0,
          is_liked: false,
          isDisabled: isDisabled,
          price: ch.price || 0
        };
      });

      mappedChapters.sort((a, b) => a.chapter_no - b.chapter_no);

      this.chapters = [
        { 
          id: 0, 
          chapter_no: 0, 
          title: 'บทนำ', 
          isDisabled: false, 
          content: this.novelDescription,
          like_count: 0,
          is_liked: false,
          price: 0
        },
        ...mappedChapters
      ];
      
      let startChapterId = 0;
      if (this.hasAccessToNovel) {
        const lastChapterId = this.getLastReadChapter();
        startChapterId = lastChapterId !== null && this.chapters.some(c => c.id === lastChapterId && !c.isDisabled)
          ? lastChapterId 
          : 0;
      }
      
      this.activeChapterId = startChapterId;
      this.loadChapter(startChapterId);
      
      this.cdr.detectChanges();
      
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      this.isLoading = false;
    }
  }

  saveReadingHistory(chapterNo: number) {
    if (!this.currentUser) {
      console.log('⚠️ ไม่ได้ login ไม่บันทึก history');
      return;
    }
    
    this.http.post(`${this.apiUrl}/reading_histories`, {
      novel_id: this.novelId,
      chapter_no: chapterNo
    }, { headers: this.getHeaders() }).subscribe({
      next: () => console.log(`✅ บันทึกประวัติ: ตอนที่ ${chapterNo}`),
      error: (err) => console.error('❌ บันทึกประวัติล้มเหลว:', err)
    });
  }

  setActiveChapter(id: number) {
    if (this.activeChapterId === id) return;
    if (this.currentLoadingChapterId === id) return;
    
    const chapter = this.chapters.find(c => c.id === id);
    
    if (chapter && chapter.isDisabled) {
      alert('กรุณาซื้อนิยายก่อนเพื่ออ่านตอนนี้');
      return;
    }
    
    if (!this.hasAccessToNovel && id !== 0) {
      alert('กรุณาซื้อนิยายก่อนเพื่ออ่านตอนอื่น');
      return;
    }
    
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
        this.saveReadingHistory(id);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  loadChapter(id: number) {
    if (this.currentLoadingChapterId === id) return;
    
    if (this.currentChapterSub) {
      this.currentChapterSub.unsubscribe();
    }
    
    this.currentLoadingChapterId = id;
    
    if (id === 0) {
      this.currentContent = this.novelDescription || 'ยังไม่มีเกริ่นนำ';
      this.safeContent = this.sanitizer.bypassSecurityTrustHtml(this.currentContent);
      this.currentLoadingChapterId = null;
      this.cdr.detectChanges();
      return;
    }
    
    const headers = this.getHeaders();

    this.currentChapterSub = this.http.get<any>(`${this.apiUrl}/novels/${this.novelId}/chapters/${id}`, { headers })
      .subscribe({
        next: (res) => {
          const rawContent = res.content || 'ไม่มีเนื้อหา';
          
          this.chapters = this.chapters.map(c => {
            if (c.id === id) {
              return {
                ...c,
                content: rawContent,
                like_count: res.like_count || 0,
                is_liked: res.is_liked === true,
                isDisabled: false
              };
            }
            return c;
          });
          
          this.currentContent = rawContent;
          this.safeContent = this.sanitizer.bypassSecurityTrustHtml(rawContent);
          this.currentLoadingChapterId = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          if (err.status === 402 && err.error) {
            this.purchaseInfo = {
              chapterId: id,
              price: err.error.price || err.error.required,
              type: err.error.requires_purchase ? 'novel' : 'chapter'
            };
            this.showPurchaseModal = true;
            this.currentLoadingChapterId = null;
            this.cdr.detectChanges();
          } else {
            console.error('Error loading chapter:', err);
            this.currentContent = 'ไม่สามารถโหลดเนื้อหาได้';
            this.safeContent = this.sanitizer.bypassSecurityTrustHtml('ไม่สามารถโหลดเนื้อหาได้');
            this.currentLoadingChapterId = null;
            this.cdr.detectChanges();
          }
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
    if (!this.hasAccessToNovel && this.activeChapterId === 0) {
      alert('กรุณาซื้อนิยายก่อนเพื่ออ่านตอนต่อไป');
      return;
    }
    
    const currentIndex = this.chapters.findIndex(c => c.id === this.activeChapterId);
    if (currentIndex < this.chapters.length - 1) {
      const nextChapter = this.chapters[currentIndex + 1];
      if (nextChapter.isDisabled) {
        alert('กรุณาซื้อนิยายก่อนเพื่ออ่านตอนนี้');
        return;
      }
      this.setActiveChapter(nextChapter.id);
    }
  }

  prevChapter() {
    if (!this.hasAccessToNovel && this.activeChapterId === 0) {
      return;
    }
    
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
        this.chapters = this.chapters.map(c => {
          if (c.id === chapter.id) {
            return {
              ...c,
              is_liked: res.liked,
              like_count: res.like_count
            };
          }
          return c;
        });        
        this.isLiking = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Like error:', err);
        this.isLiking = false;
        if (err.status === 401) {
          alert('กรุณาเข้าสู่ระบบใหม่');
          this.router.navigate(['/auth']);
        } else {
          alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
        }
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

  purchaseNovel() {
    // ป้องกันการกดซ้ำ
    if (this.isPurchasingNovel) {
      console.log('⏳ กำลังดำเนินการ กรุณารอสักครู่...');
      return;
    }
    
    // ถ้าซื้อไปแล้ว
    if (this.hasPurchasedNovel) {
      alert('คุณซื้อนิยายเรื่องนี้ไปแล้ว');
      this.showPurchaseModal = false;
      return;
    }
    
    // ถ้าเป็นเจ้าของ
    if (this.isNovelOwner) {
      alert('คุณเป็นเจ้าของนิยายเรื่องนี้');
      this.showPurchaseModal = false;
      return;
    }
    
    this.isPurchasingNovel = true;
    this.isPurchasing = true;
    
    this.http.post(`${this.apiUrl}/novels/${this.novelId}/purchase`, {}, { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          console.log('✅ Purchase success:', res);
          
          // ✅ อัปเดต state ทันที
          this.hasPurchasedNovel = true;
          this.hasAccessToNovel = true;
          
          // ✅ อัปเดตเหรียญใน currentUser
          if (this.currentUser) {
            this.currentUser.coin_balance = res.balance;
          }
          
          // ✅ บันทึก localStorage เพื่อป้องกันการซื้อซ้ำ
          localStorage.setItem(`purchased_${this.novelId}`, 'true');
          
          // ✅ ปิด modal
          this.showPurchaseModal = false;
          this.isPurchasingNovel = false;
          this.isPurchasing = false;
          
          // ✅ รีเฟรช chapters (เอาค่า disable ออก)
          this.chapters = this.chapters.map(ch => {
            if (ch.id !== 0) {
              return { ...ch, isDisabled: false };
            }
            return ch;
          });
          
          // ✅ โหลดตอนปัจจุบันใหม่
          if (this.activeChapterId !== 0) {
            this.loadChapter(this.activeChapterId);
          }
          
          // ✅ รีเฟรชข้อมูล user จาก backend (optional)
          this.userService.loadProfile();
          
          // ✅ แจ้งเตือนสำเร็จ
          alert(`✅ ${res.message || 'ซื้อนิยายสำเร็จ!'}`);
          
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Purchase error:', err);
          this.isPurchasingNovel = false;
          this.isPurchasing = false;
          
          // ✅ ถ้า error แต่ status 200 (บางที response มัน weird)
          if (err.status === 200) {
            // มันควร success แต่ error callback ถูกเรียก
            console.log('⚠️ Got status 200 but in error callback, treating as success');
            this.hasPurchasedNovel = true;
            this.hasAccessToNovel = true;
            this.showPurchaseModal = false;
            this.chapters = this.chapters.map(ch => {
              if (ch.id !== 0) {
                return { ...ch, isDisabled: false };
              }
              return ch;
            });
            if (this.activeChapterId !== 0) {
              this.loadChapter(this.activeChapterId);
            }
            alert('ซื้อนิยายสำเร็จ!');
            this.cdr.detectChanges();
            return;
          }
          
          // กรณีซื้อไปแล้ว (Conflict)
          if (err.status === 409 || err.status === 422) {
            alert('คุณซื้อนิยายเรื่องนี้ไปแล้ว');
            this.hasPurchasedNovel = true;
            this.hasAccessToNovel = true;
            this.showPurchaseModal = false;
            
            this.chapters = this.chapters.map(ch => {
              if (ch.id !== 0) {
                return { ...ch, isDisabled: false };
              }
              return ch;
            });
            
            if (this.activeChapterId !== 0) {
              this.loadChapter(this.activeChapterId);
            }
            return;
          }
          
          // กรณีเงินไม่พอ
          if (err.status === 402) {
            alert(`❌ ${err.error?.error || 'เหรียญไม่พอ กรุณาเติมเงิน'}`);
            this.showPurchaseModal = false;
            this.router.navigate(['/topup']);
            return;
          }
          
          alert('เกิดข้อผิดพลาด: ' + (err.error?.error || err.message || 'กรุณาลองอีกครั้ง'));
        }
      });
  }

  // ✅ เพิ่ม method เช็คสถานะการซื้อจาก localStorage
  checkPurchasedStatus(): boolean {
    const localFlag = localStorage.getItem(`purchased_${this.novelId}`);
    if (localFlag === 'true') {
      return true;
    }
    return this.hasPurchasedNovel;
  }

  unlockChapter() {
    if (this.isPurchasing) return;
    this.isPurchasing = true;
    
    const chapterId = this.purchaseInfo?.chapterId;
    if (!chapterId) return;
    
    this.http.post(`${this.apiUrl}/novels/${this.novelId}/chapters/${chapterId}/unlock`, {}, { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          alert(`✅ ${res.message}`);
          if (this.currentUser) {
            this.currentUser.coin_balance = res.balance;
          }
          this.showPurchaseModal = false;
          this.isPurchasing = false;
          
          this.loadChapter(chapterId);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isPurchasing = false;
          
          if (err.status === 409) {
            alert('คุณปลดล็อคตอนนี้ไปแล้ว');
            this.showPurchaseModal = false;
            this.loadChapter(chapterId);
            return;
          }
          
          if (err.status === 402) {
            alert(`❌ ${err.error?.error || 'เหรียญไม่พอ กรุณาเติมเงิน'}`);
            this.router.navigate(['/topup']);
          } else {
            alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
          }
        }
      });
  }
  
  closePurchaseModal() {
    this.showPurchaseModal = false;
    this.purchaseInfo = null;
  }
}