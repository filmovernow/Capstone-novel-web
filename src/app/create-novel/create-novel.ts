import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EditorComponent } from '@tinymce/tinymce-angular';

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
export class CreateNovelComponent {
  
  novelTitle = '';
  penName = '';
  synopsis = '';
  selectedGenres: string[] = [];
  selectedTags: string[] = [];
  selectedCover = '📖';
  coverImageUrl = '';
  saveStatus = '';
  showMonetization = false;

  genres = ['โรแมนติก', 'แฟนตาซี', 'แอ็กชัน', 'ลึกลับ', 'ไซไฟ', 'ซึ้ง', 'ตลก', 'สยองขวัญ', 'วายุ', 'GL'];
  coverEmojis = ['📖', '🌸', '⚔️', '🌙', '🏰', '🕵️', '💜', '🤖', '👻', '🍃', '📜', '😂'];
  tagSuggestions = ['รักสามเส้า', 'CEO', 'แม่บ้าน', 'มาเฟีย', 'ย้อนเวลา', 'ชาติหน้า', 'โรงเรียน', 'มหาลัย', 'ตลก', 'น้ำตาซึม'];
  newTag = '';

  chapters: Chapter[] = [];
  activeChapter: Chapter | null = null;
  private nextId = 1;

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
    toolbar: 'undo redo | blocks | ' +
      'bold italic forecolor | alignleft aligncenter ' +
      'alignright alignjustify | bullist numlist outdent indent | ' +
      'image | removeformat | help',
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; background-color: #0C134F; color: #fff; }'
  };

  toggleGenre(g: string) {
    const idx = this.selectedGenres.indexOf(g);
    if (idx > -1) this.selectedGenres.splice(idx, 1);
    else this.selectedGenres.push(g);
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
        this.selectedCover = '';
      };
      reader.readAsDataURL(file);
    }
  }

  removeCoverImage() {
    this.coverImageUrl = '';
    this.selectedCover = '📖';
  }

  addChapter() {
    const ch: Chapter = {
      id: this.nextId++,
      order: this.chapters.length + 1,
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
  }

  deleteChapter(index: number, e: MouseEvent) {
    e.stopPropagation();
    
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบตอนนี้? (ไม่สามารถกู้คืนได้)')) {
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
    if (this.activeChapter) {
      this.activeChapter.published = true;
    }
    this.saveStatus = '🚀 เผยแพร่แล้ว!';
    setTimeout(() => this.saveStatus = '', 3000);
  }
}