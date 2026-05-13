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
  needsPurchase?: boolean;
  content?: string;
  like_count?: number;
  is_liked?: boolean;
  price?: number;
  freeDate?: string;
  isEarlyAccess?: boolean;
}

interface Comment {
  id: number;
  content: string;
  user: {
    id: number;
    username: string;
    avatar_path: string | null;
  };
  created_at: string;
}

@Component({
  selector: 'app-novel-reader',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  isPurchasing = false;
  hasAccessToNovel = false;
  isNovelOwner = false;
  pricingModel: string = 'free';
  
  showUnlockConfirmModal = false;
  unlockTargetChapter: Chapter | null = null;
  showPurchaseNovelConfirm = false;
  
  // ✅ Comment properties
  comments: Comment[] = [];
  commentLoading = false;
  commentPage = 1;
  commentHasMore = true;
  isSubmittingComment = false;
  showCommentSection = false;
  totalCommentsCount = 0;
  
  private isPurchasingNovel = false;
  private isLoading = false;
  private currentLoadingChapterId: number | null = null;
  private currentChapterSub: any = null;
  private canGoBack = false;
  private previousChapterId = 0;

  constructor(
    private http: HttpClient, 
    private route: ActivatedRoute, 
    private cdr: ChangeDetectorRef, 
    private userService: UserService,
    private sanitizer: DomSanitizer,
    public router: Router,
    private location: Location
  ) {}

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

  ngOnDestroy() {
    if (this.currentChapterSub) {
      this.currentChapterSub.unsubscribe();
    }
  }

  // ==================== HELPER METHODS ====================
  
  formatNumber(value: number): string {
    if (value === undefined || value === null) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }

  formatCommentDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  showToast(message: string) {
    const toast = document.createElement('div');
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = '#1D267D';
    toast.style.color = '#D4ADFC';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '9999px';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '9999';
    toast.style.border = '1px solid #5C469C';
    toast.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
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

  // ==================== NAVIGATION ====================
  
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

  goToTopup() {
    this.router.navigate(['/topup']);
  }

  navigateTo(path: string) {
    this.profileOpen = false;
    this.router.navigate([path]);
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/']);
  }

  shareNovel() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      this.showToast('✅ คัดลอกลิงก์นิยายเรียบร้อยแล้ว');
    }).catch(() => {
      this.showToast('❌ คัดลอกไม่สำเร็จ กรุณาลองอีกครั้ง');
    });
  }

  // ==================== LOAD DATA ====================
  
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
      
      if (novel.cover_path) {
        if (novel.cover_path.startsWith('http') || novel.cover_path.includes('/')) {
          this.coverPath = novel.cover_path;
        } else if (novel.cover_path.length <= 5) {
          this.coverPath = novel.cover_path;
        } else {
          this.coverPath = novel.cover_path;
        }
      } else {
        this.coverPath = '';
      }
      
      this.genres = novel.genres || [];
      this.followCount = novel.follow_count || 0;
      this.isFollowing = novel.is_followed === true;
      this.novelPrice = novel.price || 0;
      this.hasPurchasedNovel = novel.has_purchased === true;
      this.novelAuthorId = novel.user_id || 0;
      
      this.isNovelOwner = this.currentUser && this.currentUser.id === this.novelAuthorId;
      this.hasAccessToNovel = this.isNovelOwner || this.hasPurchasedNovel;
      this.pricingModel = novel.pricing_model || 'free';
      
      const chaptersRes: any[] = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/novels/${this.novelId}/chapters`, { headers })
      );
      
      let unlockedChapters: number[] = [];
      if (this.currentUser) {
        try {
          const unlockedRes: any = await firstValueFrom(
            this.http.get(`${this.apiUrl}/users/${this.currentUser.id}/unlocked_chapters?novel_id=${this.novelId}`, { headers })
          );
          unlockedChapters = unlockedRes || [];
        } catch (e) {
          unlockedChapters = [];
        }
      }
      
      const mappedChapters: Chapter[] = chaptersRes.map(ch => {
        let isEarlyAccess = false;
        let isPaid = false;
        let price = ch.price || 0;
        let freeDateObj: Date | null = null;
        let needsPurchase = false;
        let isDisabled = false;

        if (ch.free_date) {
          freeDateObj = new Date(ch.free_date);
        }

        if (this.pricingModel === 'early_access') {
          if (freeDateObj && new Date() < freeDateObj) {
            isEarlyAccess = true;
            isPaid = true;
          } else if (freeDateObj && new Date() >= freeDateObj) {
            isEarlyAccess = false;
            isPaid = false;
          } else if (!freeDateObj && price > 0) {
            isPaid = true;
          }
        } else if (this.pricingModel === 'per_chapter' || this.pricingModel === 'one_time') {
          isPaid = price > 0 || this.pricingModel === 'one_time';
        }

        if (this.hasAccessToNovel) {
          needsPurchase = false;
          isDisabled = false;
        } else {
          if (isPaid) {
            if (unlockedChapters.includes(ch.chapter_no)) {
              needsPurchase = false;
              isDisabled = false;
            } else if (this.pricingModel === 'one_time') {
              needsPurchase = true;
              isDisabled = true;
            } else {
              needsPurchase = true;
              isDisabled = true;
            }
          }
        }

        return {
          id: ch.chapter_no,
          chapter_no: ch.chapter_no,
          title: ch.title || `ตอนที่ ${ch.chapter_no}`,
          content: undefined,
          like_count: 0,
          is_liked: false,
          isDisabled: isDisabled,
          needsPurchase: needsPurchase,
          price: price,
          freeDate: ch.free_date,
          isEarlyAccess: isEarlyAccess
        };
      });

      mappedChapters.sort((a, b) => a.chapter_no - b.chapter_no);

      this.chapters = [
        {
          id: 0,
          chapter_no: 0,
          title: 'บทนำ',
          isDisabled: false,
          needsPurchase: false,
          content: this.novelDescription,
          like_count: 0,
          is_liked: false,
          price: 0
        },
        ...mappedChapters
      ];
      
      this.chapters = [...this.chapters];

      let startChapterId = 0;
      if (this.hasAccessToNovel) {
        const lastChapterId = this.getLastReadChapter();
        startChapterId = lastChapterId !== null && this.chapters.some(c => c.id === lastChapterId && !c.isDisabled)
          ? lastChapterId
          : 0;
      }
      
      this.activeChapterId = startChapterId;
      this.previousChapterId = startChapterId;
      this.loadChapter(startChapterId);
      
      this.cdr.detectChanges();
      
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      this.isLoading = false;
    }
  }

  // ==================== CHAPTER METHODS ====================
  
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
      this.saveProgressAndHistory(0);
      
      // ✅ reset ค่า
      this.showCommentSection = false;
      this.totalCommentsCount = 0;
      this.comments = [];
      
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
                isDisabled: false,
                needsPurchase: false
              };
            }
            return c;
          });
          
          this.currentContent = rawContent;
          this.safeContent = this.sanitizer.bypassSecurityTrustHtml(rawContent);
          this.currentLoadingChapterId = null;
          
          this.saveProgressAndHistory(id);
          
          // ✅ ✅ ✅ สำคัญ: โหลดจำนวน comment ทันที
          this.loadCommentCount();
          
          // ✅ รีเซ็ต section (ไม่ต้องโหลด content comments จนกว่าจะกด)
          this.showCommentSection = false;
          
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.activeChapterId = this.previousChapterId;
          
          if (err.status === 402 && err.error) {
            this.unlockTargetChapter = this.chapters.find(c => c.id === id) || null;
            if (this.unlockTargetChapter) {
              this.showUnlockConfirmModal = true;
            }
            this.currentLoadingChapterId = null;
            this.cdr.detectChanges();
          } else {
            this.currentContent = 'ไม่สามารถโหลดเนื้อหาได้';
            this.safeContent = this.sanitizer.bypassSecurityTrustHtml('ไม่สามารถโหลดเนื้อหาได้');
            this.currentLoadingChapterId = null;
            this.cdr.detectChanges();
          }
        }
      });
  }

  private doLoadChapter(id: number) {
    this.previousChapterId = this.activeChapterId;
    this.activeChapterId = id;
    
    // ✅ ✅ ✅ สำคัญ: reset ค่าก่อนโหลด chapter ใหม่
    this.totalCommentsCount = 0;      // reset จำนวน comment
    this.comments = [];               // reset list comments
    this.showCommentSection = false;  // ปิด section
    this.commentPage = 1;             // reset page
    this.commentHasMore = true;       // reset hasMore
    
    this.loadChapter(id);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setActiveChapter(id: number) {
    if (this.activeChapterId === id) return;
    if (this.currentLoadingChapterId === id) return;
    
    const chapter = this.chapters.find(c => c.id === id);
    if (!chapter) return;
    
    if (id === 0) {
      this.doLoadChapter(0);
      return;
    }
    
    if (this.hasAccessToNovel) {
      this.doLoadChapter(id);
      return;
    }
    
    if (this.pricingModel === 'one_time') {
      this.openPurchaseNovelConfirm();
      return;
    }
    
    if (chapter.needsPurchase) {
      this.unlockTargetChapter = chapter;
      this.showUnlockConfirmModal = true;
      return;
    }
    
    if (chapter.isDisabled) {
      alert('กรุณาปลดล็อคตอนนี้ก่อนอ่าน');
      return;
    }
    
    this.doLoadChapter(id);
  }

  nextChapter() {
    const currentIndex = this.chapters.findIndex(c => c.id === this.activeChapterId);
    if (currentIndex < this.chapters.length - 1) {
      const nextChap = this.chapters[currentIndex + 1];
      this.setActiveChapter(nextChap.id);
    }
  }

  prevChapter() {
    const currentIndex = this.chapters.findIndex(c => c.id === this.activeChapterId);
    if (currentIndex > 0) {
      const prevChap = this.chapters[currentIndex - 1];
      this.setActiveChapter(prevChap.id);
    }
  }

  isPrevDisabled(): boolean {
    const currentIndex = this.chapters.findIndex(c => c.id === this.activeChapterId);
    return currentIndex <= 0;
  }

  isNextDisabled(): boolean {
    const currentIndex = this.chapters.findIndex(c => c.id === this.activeChapterId);
    return currentIndex >= this.chapters.length - 1;
  }

  getNextChapter(): Chapter | null {
    const currentIndex = this.chapters.findIndex(c => c.id === this.activeChapterId);
    if (currentIndex >= 0 && currentIndex < this.chapters.length - 1) {
      return this.chapters[currentIndex + 1];
    }
    return null;
  }

  get currentChapter() {
    return this.chapters.find(c => c.id === this.activeChapterId);
  }

  get progressPercent() {
    if (this.chapters.length <= 1) return 100;
    const index = this.chapters.findIndex(c => c.id === this.activeChapterId);
    return (index / (this.chapters.length - 1)) * 100;
  }

  get wordCount() {
    if (!this.currentContent) return 0;
    const stripped = this.currentContent.replace(/<[^>]*>/g, '');
    return stripped.length;
  }

  changeFontSize(delta: number) {
    this.fontSize = Math.min(Math.max(this.fontSize + delta, 12), 30);
  }

  private saveProgressAndHistory(id: number) {
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
      
      if (this.currentUser) {
        this.http.post(`${this.apiUrl}/reading_histories`, {
          novel_id: this.novelId,
          chapter_no: id
        }, { headers: this.getHeaders() }).subscribe();
      }
    }
  }

  // ==================== LIKE & FOLLOW ====================
  
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

  // ==================== PURCHASE & UNLOCK ====================
  
  openPurchaseNovelConfirm() {
    if (this.hasPurchasedNovel) {
      alert('คุณซื้อนิยายเรื่องนี้ไปแล้ว');
      return;
    }
    if (this.isNovelOwner) {
      alert('คุณเป็นเจ้าของนิยายเรื่องนี้');
      return;
    }
    this.showPurchaseNovelConfirm = true;
  }

  closePurchaseNovelConfirm() {
    this.showPurchaseNovelConfirm = false;
  }

  purchaseNovel() {
    if (this.isPurchasingNovel) return;
    if (this.hasPurchasedNovel) {
      alert('คุณซื้อนิยายเรื่องนี้ไปแล้ว');
      this.showPurchaseNovelConfirm = false;
      return;
    }
    if (this.isNovelOwner) {
      alert('คุณเป็นเจ้าของนิยายเรื่องนี้');
      this.showPurchaseNovelConfirm = false;
      return;
    }
    
    this.isPurchasingNovel = true;
    this.isPurchasing = true;
    
    this.http.post(`${this.apiUrl}/novels/${this.novelId}/purchase`, {}, { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          this.hasPurchasedNovel = true;
          this.hasAccessToNovel = true;
          
          if (this.currentUser) {
            this.currentUser.coin_balance = res.balance;
          }
          
          localStorage.setItem(`purchased_${this.novelId}`, 'true');
          
          this.showPurchaseNovelConfirm = false;
          this.isPurchasingNovel = false;
          this.isPurchasing = false;
          
          this.chapters = this.chapters.map(ch => {
            if (ch.id !== 0) {
              return { ...ch, isDisabled: false, needsPurchase: false };
            }
            return ch;
          });
          
          if (this.activeChapterId !== 0) {
            this.loadChapter(this.activeChapterId);
          }
          
          this.userService.loadProfile();
          alert(`✅ ${res.message || 'ซื้อนิยายสำเร็จ!'}`);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isPurchasingNovel = false;
          this.isPurchasing = false;
          
          if (err.status === 409 || err.status === 422) {
            alert('คุณซื้อนิยายเรื่องนี้ไปแล้ว');
            this.hasPurchasedNovel = true;
            this.hasAccessToNovel = true;
            this.showPurchaseNovelConfirm = false;
            
            this.chapters = this.chapters.map(ch => {
              if (ch.id !== 0) {
                return { ...ch, isDisabled: false, needsPurchase: false };
              }
              return ch;
            });
            
            if (this.activeChapterId !== 0) {
              this.loadChapter(this.activeChapterId);
            }
            return;
          }
          
          if (err.status === 402) {
            alert(`❌ ${err.error?.error || 'เหรียญไม่พอ กรุณาเติมเงิน'}`);
            this.showPurchaseNovelConfirm = false;
            this.router.navigate(['/topup']);
            return;
          }
          
          alert('เกิดข้อผิดพลาด: ' + (err.error?.error || err.message || 'กรุณาลองอีกครั้ง'));
        }
      });
  }

  showUnlockModal(chapter: Chapter) {
    if (this.hasPurchasedNovel || this.isNovelOwner) {
      this.setActiveChapter(chapter.id);
      return;
    }
    
    if (this.pricingModel === 'one_time') {
      this.openPurchaseNovelConfirm();
      return;
    }
    
    if (chapter.needsPurchase) {
      this.unlockTargetChapter = chapter;
      this.showUnlockConfirmModal = true;
    } else if (chapter.isDisabled) {
      alert('กรุณาปลดล็อคตอนก่อนอ่าน');
    }
  }

  closeUnlockConfirmModal() {
    this.showUnlockConfirmModal = false;
    this.unlockTargetChapter = null;
  }

  confirmUnlockChapter() {
    if (!this.unlockTargetChapter) return;
    
    this.isPurchasing = true;
    const chapterId = this.unlockTargetChapter.id;
    
    this.http.post(`${this.apiUrl}/novels/${this.novelId}/chapters/${chapterId}/unlock`, {}, { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          alert(`✅ ${res.message}`);
          if (this.currentUser) {
            this.currentUser.coin_balance = res.balance;
          }
          this.showUnlockConfirmModal = false;
          this.isPurchasing = false;

          this.chapters = this.chapters.map(ch => {
            if (ch.id === chapterId) {
              return { ...ch, isDisabled: false, needsPurchase: false };
            }
            return ch;
          });
          
          this.doLoadChapter(chapterId);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isPurchasing = false;
          if (err.status === 409) {
            alert('คุณปลดล็อคตอนนี้ไปแล้ว');
            this.showUnlockConfirmModal = false;
            this.loadAllData();
          } else if (err.status === 402) {
            alert(`❌ ${err.error?.error || 'เหรียญไม่พอ กรุณาเติมเงิน'}`);
            this.router.navigate(['/topup']);
          } else {
            alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
          }
        }
      });
  }

  // ==================== COMMENT METHODS ====================
  
  // ✅ โหลดเฉพาะจำนวน comment (ไม่โหลด content)
  async loadCommentCount() {
    if (this.activeChapterId === 0) {
      this.totalCommentsCount = 0;
      console.log(`📊 Chapter ${this.activeChapterId} (intro): comments = 0`);
      this.cdr.detectChanges(); // ✅ เพิ่มตรงนี้ด้วยเผื่อกรณีเป็นบทนำ
      return;
    }
    
    try {
      const headers = this.getHeaders();
      const res: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/novels/${this.novelId}/chapters/${this.activeChapterId}/comments?page=1&limit=1`, { headers })
      );
      
      // ✅ แก้ตรงนี้: res เป็น array เลย ไม่มี .comments หรือ .total
      if (Array.isArray(res)) {
        // backend ส่ง array มาโดยตรง
        this.totalCommentsCount = res.length;
      } else {
        // backend ส่ง object ที่มี comments หรือ total
        this.totalCommentsCount = res.total || res.comments?.length || 0;
      }
      
      console.log(`📊 Chapter ${this.activeChapterId}: comments = ${this.totalCommentsCount}`);
    } catch (err) {
      console.error('Error loading comment count:', err);
      this.totalCommentsCount = 0;
    } finally {
      // ✅ เพิ่มบรรทัดนี้ เพื่อบอกให้ Angular อัปเดตหน้าจอหลังจากได้ค่าใหม่แล้ว
      this.cdr.detectChanges();
    }
  }
  
  async loadComments(reset: boolean = true) {
    if (this.commentLoading) return;
    if (this.activeChapterId === 0) return;
    
    if (reset) {
      this.commentPage = 1;
      this.commentHasMore = true;
      this.comments = [];
    }
    
    if (!this.commentHasMore) return;
    
    this.commentLoading = true;
    const limit = 5; // ✅ ปรับค่า Limit ตรงนี้เป็น 5
    
    try {
      const headers = this.getHeaders();
      // ✅ แก้ไข URL ให้ส่ง limit=5 ไปยัง Backend
      const res: any = await firstValueFrom(
        this.http.get(`${this.apiUrl}/novels/${this.novelId}/chapters/${this.activeChapterId}/comments?page=${this.commentPage}&limit=${limit}`, { headers })
      );
      
      let newComments = [];
      let totalCount = 0;
      
      if (Array.isArray(res)) {
        newComments = res;
        totalCount = res.length; // กรณี Backend ส่งแค่ Array
      } else {
        newComments = res.comments || [];
        totalCount = res.total || newComments.length;
      }
      
      if (reset) {
        this.comments = newComments;
      } else {
        this.comments = [...this.comments, ...newComments];
      }
      
      // ✅ เช็คว่ายังมีต่อไหม: ถ้าจำนวนที่โหลดมาได้ "เท่ากับ" Limit ที่ตั้งไว้ แสดงว่าน่าจะมีหน้าถัดไป
      this.commentHasMore = newComments.length === limit;
      
      if (this.commentHasMore) {
        this.commentPage++; // เตรียมเลขหน้าไว้สำหรับกดโหลดครั้งถัดไป
      }
      
      this.totalCommentsCount = totalCount;
      
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      this.commentLoading = false;
      this.cdr.detectChanges(); // ✅ มั่นใจว่า UI อัปเดตแน่นอน
    }
  }

  loadMoreComments() {
    if (!this.commentHasMore || this.commentLoading) return;
    this.loadComments(false);
  }

  async submitComment() {
    if (this.activeChapterId === 0) {
      alert('ไม่สามารถแสดงความคิดเห็นในบทนำได้');
      return;
    }
    
    if (!this.currentUser) {
      alert('กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น');
      this.router.navigate(['/auth']);
      return;
    }
    
    if (!this.newComment.trim()) {
      alert('กรุณากรอกข้อความ');
      return;
    }
    
    if (this.newComment.length > 1000) {
      alert('ความคิดเห็นต้องไม่เกิน 1000 ตัวอักษร');
      return;
    }
    
    this.isSubmittingComment = true;
    
    try {
      const res: any = await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/novels/${this.novelId}/chapters/${this.activeChapterId}/comments`,
          { comment: { content: this.newComment.trim() } },
          { headers: this.getHeaders() }
        )
      );
      
      this.comments = [res.comment, ...this.comments];
      this.totalCommentsCount = this.comments.length;
      this.newComment = '';
      this.showToast('💬 แสดงความคิดเห็นเรียบร้อยแล้ว');
      
    } catch (err: any) {
      console.error('Error posting comment:', err);
      alert(err.error?.errors?.[0] || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    } finally {
      this.isSubmittingComment = false;
      this.cdr.detectChanges();
    }
  }

  async deleteComment(commentId: number) {
    if (!confirm('คุณต้องการลบความคิดเห็นนี้ใช่หรือไม่?')) return;
    
    try {
      await firstValueFrom(
        this.http.delete(
          `${this.apiUrl}/novels/${this.novelId}/chapters/${this.activeChapterId}/comments/${commentId}`,
          { headers: this.getHeaders() }
        )
      );
      
      // ✅ กรองคอมเมนต์ที่ถูกลบออกจาก Array
      this.comments = this.comments.filter(c => c.id !== commentId);
      
      // ✅ แก้ไข Logic: ให้ลดจำนวนทั้งหมดลง 1 แทนการนับจาก length ของ array ที่อาจจะยังโหลดมาไม่หมด
      if (this.totalCommentsCount > 0) {
        this.totalCommentsCount--;
      }
      
      this.showToast('🗑️ ลบความคิดเห็นเรียบร้อยแล้ว');
      
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      alert(err.error?.error || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    } finally {
      // ✅ เพิ่มบรรทัดนี้ เพื่อบอกให้ Angular อัปเดตหน้าจอทันทีหลังจากลบเสร็จ
      this.cdr.detectChanges();
    }
  }

  toggleCommentSection() {
    this.showCommentSection = !this.showCommentSection;
    if (this.showCommentSection && this.comments.length === 0) {
      this.loadComments(true);
    }
  }
}