import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
interface Chapter {
  id: number;
  title: string;
  status?: 'reading' | 'upcoming';
  isDisabled?: boolean;
}

@Component({
  selector: 'app-novel-reader',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './novel-reader.html'
})
export class NovelReaderComponent {
  // State
  activeChapterId = 7;
  fontSize = 16;
  newComment = '';

  // Mock Data
  chapters: Chapter[] = [
    { id: 1, title: 'เริ่มต้นใหม่' },
    { id: 2, title: 'หิมะแรก' },
    { id: 3, title: 'คนแปลกหน้า' },
    { id: 4, title: 'เบื้องหลังรอยยิ้ม' },
    { id: 5, title: 'ความลับของเขา' },
    { id: 6, title: 'คืนที่พายุมา' },
    { id: 7, title: 'หัวใจที่หลงหาย', status: 'reading' },
    { id: 8, title: 'คำสัญญาใต้หิมะ' },
    { id: 9, title: 'ตอนต่อไป...', status: 'upcoming', isDisabled: true },
  ];

  get currentChapter() {
    return this.chapters.find(c => c.id === this.activeChapterId);
  }

  get progressPercent() {
    return (this.activeChapterId / (this.chapters.length - 1)) * 100;
  }

  // Handlers
  changeFontSize(delta: number) {
    this.fontSize = Math.min(Math.max(this.fontSize + delta, 12), 30);
  }

  setActiveChapter(id: number) {
    const chapter = this.chapters.find(c => c.id === id);
    if (chapter && !chapter.isDisabled) {
      this.activeChapterId = id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}