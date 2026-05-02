import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { EditorComponent } from '@tinymce/tinymce-angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin } from 'rxjs';

interface Chapter {
  id: number;
  order: number;
  title: string;
  content: string;
  published: boolean;
  price?: number;           // สำหรับ per_chapter
  earlyAccessPrice?: number; // สำหรับ early_access
  freeDate?: string;        // วันที่ปลดล็อคให้ฟรี
  comments?: Comment[];
}

interface Comment {
  id: number;
  username: string;
  avatar: string;
  content: string;
  timestamp: Date;
  likes: number;
}

@Component({
  selector: 'app-create-novel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EditorComponent],
  templateUrl: './create-novel.html',
})
export class CreateNovelComponent implements OnInit, OnDestroy {
  
  novelTitle = '';
  penName = '';
  synopsis = '';
  selectedGenres: string[] = [];
  selectedTags: string[] = [];
  selectedCover = '📖';
  coverImageUrl = '';
  coverBase64 = '';
  saveStatus = '';
  currentStatus: 'draft' | 'writing' | 'published' = 'writing';

  genres: string[] = [
    'romance', 'comedy', 'girl love', 'boy love', 
    'fantasy', 'science', 'fiction', 'mystery', 
    'war', 'adventure', 'action', 'thriller', 'horror'
  ];
  
  coverEmojis = ['📖', '🌸', '⚔️', '🌙', '🏰', '🕵️', '💜', '🤖', '👻', '🍃', '📜', '😂'];
  tagSuggestions = ['รักสามเส้า', 'CEO', 'แม่บ้าน', 'มาเฟีย', 'ย้อนเวลา', 'ชาติหน้า', 'โรงเรียน', 'มหาลัย', 'ตลก', 'น้ำตาซึม'];
  newTag = '';

  chapters: Chapter[] = [];
  activeChapter: Chapter | null = null;
  private nextId = 1;
  private autoSaveTimer: any = null;
  private isSaving = false;

  apiUrl = 'http://localhost:3000/api/v1';
  
  novelId: number | null = null;
  isEditMode = false;

  // ✅ ใช้แค่ pricingModel แบบเดียว
  pricingModel: 'one_time' | 'early_access' | 'free' | 'per_chapter' = 'free';
  oneTimePrice = 0;
  earlyAccessPrice = 0;
  earlyAccessDays = 7;
  perChapterPrice = 0;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchGenres();
    this.startAutoSave();
    
    this.route.queryParams.subscribe(params => {
      if (params['novelId']) {
        this.novelId = Number(params['novelId']);
        this.isEditMode = true;
        this.loadNovelData();
      }
    });
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.novelId = Number(id);
        this.isEditMode = true;
        this.loadNovelData();
      }
    });
  }

  ngOnDestroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }

  startAutoSave() {
    this.autoSaveTimer = setInterval(() => {
      if (this.hasUnsavedChanges() && !this.isSaving) {
        this.autoSave();
      }
    }, 10000);
  }

  hasUnsavedChanges(): boolean {
    return !!this.novelTitle || !!this.synopsis || 
           this.chapters.some(ch => ch.content && ch.content.trim());
  }

  autoSave() {
    if (!this.novelTitle && !this.synopsis && this.chapters.length === 0) {
      return;
    }

    console.log('🔄 Auto-saving... (status: writing)');
    
    if (this.isEditMode && this.novelId) {
      this.updateNovel('writing', false);
    } else {
      this.createNovelWithoutRedirect('writing');
    }
  }

  createNovelWithoutRedirect(status: 'draft' | 'writing' | 'published') {
    this.isSaving = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const { isPremium, novelPrice } = this.getPricingData();

    const novelData: any = {
      novel: {
        title: this.novelTitle,
        description: this.synopsis,
        pen_name: this.penName,
        genres: this.selectedGenres,
        status: status,
        is_premium: isPremium,
        price: novelPrice,
        pricing_model: this.pricingModel,
        early_access_days: this.earlyAccessDays,
        per_chapter_price: this.perChapterPrice
      }
    };

    if (this.coverBase64) {
      novelData.cover_content = this.coverBase64;
    }

    this.http.post(`${this.apiUrl}/novels`, novelData, { headers }).subscribe({
      next: (novelRes: any) => {
        this.novelId = novelRes.id;
        this.isEditMode = true;
        this.currentStatus = status;
        this.saveChapters(this.novelId!, status, false);
      },
      error: (err) => {
        console.error('Auto-save error:', err);
        this.isSaving = false;
      }
    });
  }

  // ✅ helper method แปลง pricingModel
  getPricingData(): { isPremium: boolean; novelPrice: number } {
    switch(this.pricingModel) {
      case 'one_time':
        return { isPremium: true, novelPrice: this.oneTimePrice };
      case 'early_access':
        return { isPremium: true, novelPrice: 0 };
      case 'per_chapter':
        return { isPremium: true, novelPrice: 0 };
      case 'free':
      default:
        return { isPremium: false, novelPrice: 0 };
    }
  }

  loadNovelData() {
    this.http.get<any>(`${this.apiUrl}/novels/${this.novelId}`)
      .subscribe({
        next: (novel) => {
          this.novelTitle = novel.title;
          this.penName = novel.pen_name;
          this.synopsis = novel.description;
          this.selectedGenres = novel.genres?.map((g: any) => g.name) || [];
          this.currentStatus = novel.status || 'writing';
          if (novel.cover_path) {
            this.coverImageUrl = novel.cover_path;
          }
          
          // ✅ โหลด pricingModel จาก backend
          if (novel.pricing_model) {
            this.pricingModel = novel.pricing_model;
          } else if (novel.is_premium) {
            // fallback สำหรับข้อมูลเก่า
            this.pricingModel = novel.price > 0 ? 'one_time' : 'early_access';
          } else {
            this.pricingModel = 'free';
          }
          
          this.oneTimePrice = novel.price || 0;
          this.earlyAccessDays = novel.early_access_days || 7;
          this.perChapterPrice = novel.per_chapter_price || 0;
          
          this.http.get<any[]>(`${this.apiUrl}/novels/${this.novelId}/chapters`)
            .subscribe({
              next: (chapters) => {
                console.log('📚 Chapters from API:', chapters);
                
                this.chapters = [];
                this.nextId = 1;
                
                if (chapters && chapters.length > 0) {
                  chapters.forEach((ch) => {
                    const chapter: Chapter = {
                      id: ch.id,
                      order: ch.chapter_no,
                      title: ch.title || `ตอนที่ ${ch.chapter_no}`,
                      content: ch.content || '',
                      published: true,
                      price: ch.price || 0,
                      earlyAccessPrice: ch.early_access_price || ch.price || 0,
                      freeDate: ch.free_date,
                      comments: []
                    };
                    this.chapters.push(chapter);
                  });
                }
                
                console.log('📋 Chapters loaded:', this.chapters);
                this.cdr.detectChanges();
                
                if (this.chapters.length > 0) {
                  this.activeChapter = this.chapters[0];
                } else {
                  this.addChapter();
                }
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error('Error loading chapters:', err);
                this.addChapter();
              }
            });
        },
        error: (err) => console.error('Error loading novel:', err)
      });
  }

  fetchGenres() {
    this.http.get<{genres: string[]}>(`${this.apiUrl}/novels/genres`).subscribe({
      next: (res) => {
        if (res.genres && res.genres.length > 0) {
          this.genres = res.genres;
        }
      },
      error: (err) => console.error('Error loading genres:', err)
    });
  }

  editorConfig = {
    height: 500,
    menubar: false,
    skin: 'oxide-dark',
    content_css: 'dark',
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
    ],
    toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image | removeformat | help',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; background-color: #0C134F; color: #fff; }'
  };

  toggleGenre(g: string) {
    const idx = this.selectedGenres.indexOf(g);
    if (idx > -1) {
      this.selectedGenres.splice(idx, 1);
    } else {
      this.selectedGenres.push(g);
    }
  }

  addTag() {
    if (this.newTag.trim() && !this.selectedTags.includes(this.newTag.trim())) {
      this.selectedTags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  toggleTag(tag: string) {
    const idx = this.selectedTags.indexOf(tag);
    if (idx > -1) this.selectedTags.splice(idx, 1);
    else this.selectedTags.push(tag);
  }

  removeTag(tag: string) {
    const idx = this.selectedTags.indexOf(tag);
    if (idx > -1) this.selectedTags.splice(idx, 1);
  }

  handleCoverImageUpload(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverImageUrl = e.target.result;
        this.coverBase64 = e.target.result.split(',')[1];
        this.selectedCover = '';
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  removeCoverImage() {
    this.coverImageUrl = '';
    this.coverBase64 = '';
    this.selectedCover = '📖';
  }

  addChapter() {
    const newOrder = this.chapters.length + 1;
    
    const ch: Chapter = {
      id: this.nextId++,
      order: newOrder,
      title: '',
      content: '',
      published: false,
      price: 0,
      earlyAccessPrice: this.earlyAccessPrice,
      comments: [],
    };
    this.chapters.push(ch);
    this.selectChapter(ch);
  }

  selectChapter(ch: Chapter) {
    this.activeChapter = ch;
    this.cdr.detectChanges();
  }

  deleteChapter(index: number, e: MouseEvent) {
    e.stopPropagation();
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบตอนนี้?')) {
      const deleted = this.chapters.splice(index, 1)[0];
      this.chapters.forEach((c, i) => c.order = i + 1);
      if (this.activeChapter?.id === deleted.id) {
        const nextActive = this.chapters[index] ?? this.chapters[index - 1] ?? null;
        if (nextActive) this.selectChapter(nextActive);
        else this.activeChapter = null;
      }
    }
  }


  addComment(content: string) {
    if (!this.activeChapter || !content.trim()) return;
    const comment: Comment = {
      id: Date.now(),
      username: 'ผู้อ่าน' + Math.floor(Math.random() * 1000),
      avatar: '👤',
      content: content.trim(),
      timestamp: new Date(),
      likes: 0,
    };
    if (!this.activeChapter.comments) this.activeChapter.comments = [];
    this.activeChapter.comments.push(comment);
  }

  saveChapter() {
    this.saveStatus = '✓ บันทึกตอนนี้แล้ว';
    setTimeout(() => this.saveStatus = '', 2000);
  }

  saveDraft() {
    if (this.isEditMode && this.novelId) {
      this.updateNovel('draft', true);
    } else {
      this.createNovel('draft', true);
    }
  }

  publish() {
    if (!this.novelTitle || !this.penName) {
      alert('กรุณากรอกชื่อนิยายและนามปากกาก่อนเผยแพร่');
      return;
    }

    if (this.isEditMode && this.novelId) {
      this.updateNovel('published', true);
    } else {
      this.createNovel('published', true);
    }
  }

  createNovel(status: 'draft' | 'writing' | 'published', shouldRedirect: boolean = false) {
    this.isSaving = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const { isPremium, novelPrice } = this.getPricingData();

    const novelData: any = {
      novel: {
        title: this.novelTitle,
        description: this.synopsis,
        pen_name: this.penName,
        genres: this.selectedGenres,
        status: status,
        is_premium: isPremium,
        price: novelPrice,
        pricing_model: this.pricingModel,
        early_access_days: this.earlyAccessDays,
        per_chapter_price: this.perChapterPrice
      }
    };

    if (this.coverBase64) {
      novelData.cover_content = this.coverBase64;
    }

    const statusText = status === 'published' ? 'เผยแพร่' : (status === 'draft' ? 'บันทึกร่าง' : 'บันทึกอัตโนมัติ');
    this.saveStatus = `⏳ กำลัง${statusText}...`;

    this.http.post(`${this.apiUrl}/novels`, novelData, { headers }).subscribe({
      next: (novelRes: any) => {
        const novelId = novelRes.id;
        this.novelId = novelId;
        this.isEditMode = true;
        this.currentStatus = status;
        this.saveChapters(novelId, status, shouldRedirect);
      },
      error: (err) => {
        console.error('Error creating novel:', err);
        this.saveStatus = '❌ ไม่สำเร็จ';
        this.isSaving = false;
        alert('เกิดข้อผิดพลาด: ' + (err.error?.error || 'ลองใหม่ทีหลัง'));
      }
    });
  }

  updateNovel(status: 'draft' | 'writing' | 'published', shouldRedirect: boolean = false) {
    this.isSaving = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    let finalStatus = status;
    if (this.currentStatus === 'published' && status === 'writing') {
      finalStatus = 'writing';
    }

    const { isPremium, novelPrice } = this.getPricingData();

    const novelData: any = {
      novel: {
        title: this.novelTitle,
        description: this.synopsis,
        genres: this.selectedGenres,
        status: finalStatus,
        is_premium: isPremium,
        price: novelPrice,
        pricing_model: this.pricingModel,
        early_access_days: this.earlyAccessDays,
        per_chapter_price: this.perChapterPrice
      }
    };

    if (this.coverBase64) {
      novelData.cover_content = this.coverBase64;
    }

    const statusText = finalStatus === 'published' ? 'เผยแพร่' : (finalStatus === 'draft' ? 'บันทึกร่าง' : 'บันทึกอัตโนมัติ');
    this.saveStatus = `⏳ กำลัง${statusText}...`;

    this.http.patch(`${this.apiUrl}/novels/${this.novelId}`, novelData, { headers }).subscribe({
      next: () => {
        this.currentStatus = finalStatus;
        this.saveStatus = `✅ ${statusText}สำเร็จ!`;
        
        if (shouldRedirect && (finalStatus === 'draft' || finalStatus === 'published')) {
          setTimeout(() => {
            this.router.navigate(['/writer']);
          }, 500);
        } else if (finalStatus === 'published') {
          setTimeout(() => {
            this.router.navigate(['/writer']);
          }, 1000);
        } else {
          setTimeout(() => this.saveStatus = '', 2000);
        }
        
        if (this.novelId) {
          this.saveChapters(this.novelId!, finalStatus, shouldRedirect);
        } else {
          this.isSaving = false;
        }
      },
      error: (err) => {
        console.error('Error updating novel:', err);
        this.saveStatus = '❌ ไม่สำเร็จ';
        this.isSaving = false;
      }
    });
  }

  saveChapters(novelId: number, novelStatus: 'draft' | 'writing' | 'published', shouldRedirect: boolean = false) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    const chaptersToSave = this.chapters.filter(ch => ch.content && ch.content.trim());
    
    if (chaptersToSave.length === 0) {
      this.isSaving = false;
      if (shouldRedirect && (novelStatus === 'draft' || novelStatus === 'published')) {
        this.router.navigate(['/writer']);
      }
      return;
    }

    this.http.get<any[]>(`${this.apiUrl}/novels/${novelId}/chapters`, { headers })
      .subscribe({
        next: (existingChapters) => {
          const existingMap = new Map();
          existingChapters.forEach(ch => {
            existingMap.set(ch.chapter_no, ch);
          });
          
          const requests: any[] = [];
          
          chaptersToSave.forEach((ch, index) => {
            const chapterNo = index + 1;
            
            let chapterPrice = 0;
            
            if (this.pricingModel === 'per_chapter') {
              chapterPrice = ch.price ?? this.perChapterPrice;
              if (chapterNo === 1 && chapterPrice === 0) {
                chapterPrice = 0;
              }
            } else if (this.pricingModel === 'early_access') {
              chapterPrice = ch.earlyAccessPrice ?? this.earlyAccessPrice;
            }
            
            const chapterData: any = {
              title: ch.title || `ตอนที่ ${chapterNo}`,
              content: ch.content,
              price: chapterPrice
            };
            
            if (this.pricingModel === 'early_access' && ch.freeDate) {
              chapterData.free_date = ch.freeDate;
            }
            
            if (existingMap.has(chapterNo)) {
              requests.push(
                this.http.patch(`${this.apiUrl}/novels/${novelId}/chapters/${chapterNo}`, chapterData, { headers })
              );
            } else {
              requests.push(
                this.http.post(`${this.apiUrl}/novels/${novelId}/chapters`, {
                  chapter_no: chapterNo,
                  ...chapterData
                }, { headers })
              );
            }
          });
          
          forkJoin(requests).subscribe({
            next: () => {
              this.isSaving = false;
              if (shouldRedirect && (novelStatus === 'draft' || novelStatus === 'published')) {
                this.router.navigate(['/writer']);
              } else {
                this.saveStatus = '✅ บันทึกสำเร็จ';
                setTimeout(() => this.saveStatus = '', 2000);
              }
            },
            error: (err) => {
              console.error('Error saving chapters:', err);
              this.saveStatus = '⚠️ บันทึกไม่สำเร็จ';
              this.isSaving = false;
            }
          });
        },
        error: (err) => {
          console.error('Error fetching existing chapters:', err);
          this.isSaving = false;
        }
      });
  }
}