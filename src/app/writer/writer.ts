import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EditorComponent } from '@tinymce/tinymce-angular';

interface Novel {
  id: number;
  title: string;
  desc: string;
  icon: string;
  tags: string[];
  status: 'writing' | 'published' | 'draft';
  statusLabel: string;
  statusClass: string;
  bg: string;
  chapters: number;
  views: string;
  likes: string;
  progress: number;
}

@Component({
  selector: 'app-writer',
  standalone: true,
  imports: [CommonModule, RouterLink, EditorComponent],
  templateUrl: './writer.html',
})
export class WriterComponent {

  selectedTab = 'all';

  tabs = [
    { key: 'all',       icon: '📚', label: 'ทั้งหมด',     count: 4 },
    { key: 'writing',   icon: '✏️',  label: 'กำลังเขียน',  count: 2 },
    { key: 'published', icon: '🌟', label: 'เผยแพร่แล้ว', count: 1 },
    { key: 'draft',     icon: '📝', label: 'แบบร่าง',      count: 1 },
  ];

  stats = [
    { icon: '📖', value: '4',     label: 'นิยายทั้งหมด' },
    { icon: '👁',  value: '24.5K', label: 'ยอดวิวรวม' },
    { icon: '❤️', value: '1,280', label: 'ยอดถูกใจรวม' },
    { icon: '✍️', value: '38',    label: 'ตอนที่เขียนแล้ว' },
  ];

  novels: Novel[] = [
    {
      id: 1, title: 'ดอกไม้แห่งฤดูหนาว', desc: 'สาวน้อยผู้หนีจากอดีตอันเจ็บปวด ได้พบรักใหม่ท่ามกลางหิมะที่โปรยปราย...',
      icon: '🌸', tags: ['โรแมนติก', 'ซึ้ง'], status: 'published',
      statusLabel: '🌟 เผยแพร่แล้ว', statusClass: 'bg-[#72f5c8] text-[#0a2e22]',
      bg: 'from-[#1D267D] to-[#5C469C]', chapters: 18, views: '12.5K', likes: '840', progress: 100,
    },
    {
      id: 2, title: 'ราชันย์แห่งความมืด', desc: 'นักดาบผู้โดดเดี่ยวต้องออกค้นหาความจริงที่ซ่อนอยู่ในอาณาจักรลึกลับ...',
      icon: '⚔️', tags: ['แฟนตาซี', 'แอ็กชัน'], status: 'writing',
      statusLabel: '✏️ กำลังเขียน', statusClass: 'bg-[#D4ADFC] text-[#0C134F]',
      bg: 'from-[#3d1a6e] to-[#1D267D]', chapters: 12, views: '8.2K', likes: '310', progress: 65,
    },
    {
      id: 3, title: 'ความลับใต้ดวงจันทร์', desc: 'สองวิญญาณที่พบกันในคืนจันทร์เต็มดวง กับปริศนาที่ไม่มีใครกล้าเปิดเผย...',
      icon: '🌙', tags: ['ลึกลับ', 'โรแมนติก'], status: 'writing',
      statusLabel: '✏️ กำลังเขียน', statusClass: 'bg-[#D4ADFC] text-[#0C134F]',
      bg: 'from-[#5C469C] to-[#1D267D]', chapters: 8, views: '3.8K', likes: '130', progress: 40,
    },
    {
      id: 4, title: 'โลกคู่ขนาน', desc: 'นักวิทยาศาสตร์ที่ค้นพบประตูสู่มิติอื่น แต่ไม่รู้ว่าจะกลับมาได้ไหม...',
      icon: '🤖', tags: ['ไซไฟ'], status: 'draft',
      statusLabel: '📝 แบบร่าง', statusClass: 'bg-[#7B6FA0] text-white',
      bg: 'from-[#1a0a3d] to-[#5C469C]', chapters: 2, views: '—', likes: '—', progress: 10,
    },
  ];

  get filteredNovels(): Novel[] {
    if (this.selectedTab === 'all') return this.novels;
    return this.novels.filter(n => n.status === this.selectedTab);
  }
}