import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
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
  accessType: 'free' | 'paid' | 'earlyAccess';
  price?: number;
  scheduledDate?: string;
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
export class CreateNovelComponent implements OnInit {
  
  novelTitle = '';
  penName = '';
  synopsis = '';
  selectedGenres: string[] = [];
  selectedTags: string[] = [];
  selectedCover = '📖';
  coverImageUrl = '';
  coverBase64 = '';
  saveStatus = '';
  showMonetization = false;

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

  apiUrl = 'http://localhost:3000/api/v1';
  
  novelId: number | null = null;
  isEditMode = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.fetchGenres();
    
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

  loadNovelData() {
    this.http.get<any>(`${this.apiUrl}/novels/${this.novelId}`)
      .subscribe({
        next: (novel) => {
          this.novelTitle = novel.title;
          this.penName = novel.pen_name;
          this.synopsis = novel.description;
          this.selectedGenres = novel.genres?.map((g: any) => g.name) || [];
          if (novel.cover_path) {
            this.coverImageUrl = novel.cover_path;
          }
          this.http.get<any[]>(`${this.apiUrl}/novels/${this.novelId}/chapters`)
            .subscribe({
              next: (chapters) => {
                console.log('📚 Chapters from API:', chapters);
                
                this.chapters = [];
                this.nextId = 1;
                
                // ✅ โหลดตอนที่มีอยู่แล้ว
                if (chapters && chapters.length > 0) {
                  chapters.forEach((ch) => {
                    const chapter: Chapter = {
                      id: this.nextId++,
                      order: ch.chapter_no,
                      title: ch.title || `ตอนที่ ${ch.chapter_no}`,
                      content: ch.content || '',
                      published: true,
                      accessType: 'free',
                      comments: []
                    };
                    this.chapters.push(chapter);
                  });
                }
                
                console.log('📋 All chapters loaded:', this.chapters.length);
                console.log('📋 Chapters:', this.chapters.map(c => ({ order: c.order, title: c.title })));
                
                this.cdr.detectChanges();
                
                // ✅ เลือกตอนแรก
                if (this.chapters.length > 0) {
                  this.activeChapter = this.chapters[0];
                  console.log('✅ Selected chapter:', this.activeChapter.order);
                } else {
                  // ✅ ถ้าไม่มีตอน ให้สร้างตอนเปล่าไว้ 1 ตอน
                  this.addChapter();
                }
                this.cdr.detectChanges();
              },
              error: (err) => {
                console.error('Error loading chapters:', err);
                this.chapters = [];
                this.activeChapter = null;
                // ✅ ถ้า error ให้สร้างตอนเปล่าไว้ 1 ตอน
                this.addChapter();
                this.cdr.detectChanges();
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
    const newOrder = this.chapters.length + 1;  // เริ่มที่ 1
    
    const ch: Chapter = {
      id: this.nextId++,
      order: newOrder,
      title: '',
      content: '',
      published: false,
      accessType: 'free',
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

  toggleMonetization() {
    this.showMonetization = !this.showMonetization;
  }

  setAccessType(type: 'free' | 'paid' | 'earlyAccess') {
    if (this.activeChapter) {
      this.activeChapter.accessType = type;
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
    this.saveStatus = '✓ บันทึกร่างแล้ว';
    setTimeout(() => this.saveStatus = '', 2000);
  }

  publish() {
    if (!this.novelTitle || !this.penName) {
      alert('กรุณากรอกชื่อนิยายและนามปากกาก่อนเผยแพร่');
      return;
    }

    if (this.isEditMode && this.novelId) {
      this.updateNovel();
    } else {
      this.createNovel();
    }
  }

  createNovel() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const novelData: any = {
      novel: {
        title: this.novelTitle,
        description: this.synopsis,
        pen_name: this.penName,
        genres: this.selectedGenres
      }
    };

    if (this.coverBase64) {
      novelData.cover_content = this.coverBase64;
    }

    this.saveStatus = '⏳ กำลังบันทึกนิยาย...';

    this.http.post(`${this.apiUrl}/novels`, novelData, { headers }).subscribe({
      next: (novelRes: any) => {
        const novelId = novelRes.id;
        this.saveChapters(novelId);
      },
      error: (err) => {
        console.error('Error creating novel:', err);
        this.saveStatus = '❌ เผยแพร่ไม่สำเร็จ';
        alert('เกิดข้อผิดพลาด: ' + (err.error?.error || 'ลองใหม่ทีหลัง'));
      }
    });
  }

  updateNovel() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const novelData: any = {
      novel: {
        title: this.novelTitle,
        description: this.synopsis,
        genres: this.selectedGenres
      }
    };

    if (this.coverBase64) {
      novelData.cover_content = this.coverBase64;
    }

    this.saveStatus = '⏳ กำลังอัปเดตนิยาย...';

    this.http.patch(`${this.apiUrl}/novels/${this.novelId}`, novelData, { headers }).subscribe({
      next: () => {
        this.saveStatus = '✅ อัปเดตนิยายสำเร็จ!';
        this.saveChapters(this.novelId!);
      },
      error: (err) => {
        console.error('Error updating novel:', err);
        this.saveStatus = '❌ อัปเดตไม่สำเร็จ';
      }
    });
  }

  saveChapters(novelId: number) {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    // ✅ บันทึกเฉพาะตอนที่มี content (order 1,2,3...)
    const chaptersToSave = this.chapters.filter(ch => ch.content && ch.content.trim());
    
    if (chaptersToSave.length === 0) {
      this.router.navigate(['/writer']);
      return;
    }

    const chapterRequests = chaptersToSave.map((ch, index) => {
      const chapterData = {
        chapter_no: index + 1,
        title: ch.title || `ตอนที่ ${index + 1}`,
        content: ch.content
      };
      return this.http.post(`${this.apiUrl}/novels/${novelId}/chapters`, chapterData, { headers });
    });

    forkJoin(chapterRequests).subscribe({
      next: () => {
        this.saveStatus = '✅ เผยแพร่สำเร็จ!';
        setTimeout(() => {
          this.router.navigate(['/writer']).then(() => {
            window.location.reload();
          });
        }, 1000);
      },
      error: (err) => {
        console.error('Error saving chapters:', err);
        this.saveStatus = '⚠️ บันทึกนิยายสำเร็จ แต่บางตอนอาจไม่ถูกบันทึก';
        setTimeout(() => {
          this.router.navigate(['/writer']).then(() => {
            window.location.reload();
          });
        }, 2000);
      }
    });
  }
}