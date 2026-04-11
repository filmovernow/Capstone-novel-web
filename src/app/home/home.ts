import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { UserService } from '../service/user.service'; 
import { ChangeDetectorRef } from '@angular/core';

interface Book {
  title: string;
  author: string;
  icon: string;
  tags: string[];
  badge: string;
  badgeClass: string;
  star: string;
  views: string;
  genre: string;
  bg: string;
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
  searchResults: Book[] = [];

  categories = ['ทั้งหมด', 'อัปเดตใหม่', 'กำลังฮิต', 'จบแล้ว'];
  selectedCat = 'ทั้งหมด';

  selectedTag = '';

  allTags = ['แฟนตาซี', 'วายุ', 'โรแมนติก', 'แอ็กชัน', 'ลึกลับ', 'ซึ้ง', 'GL', 'ไซไฟ', 'ตลก', 'สยองขวัญ'];

  books: Book[] = [
    { title: 'ดอกไม้แห่งฤดูหนาว',    author: 'มินตรา ช.',       icon: '🌸', tags: ['โรแมนติก', 'ซึ้ง'],         badge: 'ใหม่', badgeClass: 'bg-[#72f5c8] text-[#0a2e22]', star: '4.9', views: '12.5K', genre: 'โรแมนติก',      bg: 'from-[#1D267D] to-[#5C469C]' },
    { title: 'นักดาบล้างแค้น',         author: 'วีระ ก.',         icon: '⚔️', tags: ['แอ็กชัน', 'แฟนตาซี'],      badge: 'ฮิต',  badgeClass: 'bg-[#ff6f91] text-white',      star: '4.7', views: '88K',   genre: 'แอ็กชัน',       bg: 'from-[#3d1a6e] to-[#1D267D]' },
    { title: 'ความลับในคืนฝน',         author: 'ปวีณา น.',        icon: '🕵️', tags: ['ลึกลับ', 'ระทึก'],          badge: 'TOP',  badgeClass: 'bg-[#ffd700] text-[#2a1a00]',  star: '4.8', views: '54K',   genre: 'ลึกลับ',         bg: 'from-[#0C134F] to-[#1D267D]' },
    { title: 'หัวใจพันกัน',             author: 'ไพลิน ว.',        icon: '💜', tags: ['วายุ', 'โรแมนติก'],         badge: '',     badgeClass: '',                             star: '4.9', views: '210K',  genre: 'วายุ',           bg: 'from-[#5C469C] to-[#9b72cf]' },
    { title: 'โลกหลังดิจิทัล',         author: 'กิตติ ร.',        icon: '🤖', tags: ['ไซไฟ', 'ระทึก'],            badge: 'ใหม่', badgeClass: 'bg-[#72f5c8] text-[#0a2e22]', star: '4.6', views: '8.2K',  genre: 'ไซไฟ',           bg: 'from-[#1a0a3d] to-[#5C469C]' },
    { title: 'วิญญาณเมืองเก่า',        author: 'ศิริพร ม.',       icon: '👻', tags: ['สยองขวัญ', 'ลึกลับ'],       badge: '',     badgeClass: '',                             star: '4.5', views: '31K',   genre: 'สยองขวัญ',       bg: 'from-[#1D267D] to-[#3a2080]' },
    { title: 'สองจิตใต้ดวงจันทร์',    author: 'รัชนี ด.',        icon: '🌙', tags: ['GL', 'โรแมนติก'],            badge: '',     badgeClass: '',                             star: '4.8', views: '45K',   genre: 'GL',             bg: 'from-[#5C469C] to-[#1D267D]' },
    { title: 'จอมอาณาจักรหิน',        author: 'ธนากร ส.',        icon: '📜', tags: ['ประวัติศาสตร์', 'แอ็กชัน'], badge: '',     badgeClass: '',                             star: '4.7', views: '19K',   genre: 'ประวัติศาสตร์',  bg: 'from-[#0C134F] to-[#5C469C]' },
    { title: 'อุ๊ยตาย! รักซะแล้ว',    author: 'ชนัญ ว.',         icon: '😂', tags: ['ตลก', 'โรแมนติก'],          badge: 'ใหม่', badgeClass: 'bg-[#72f5c8] text-[#0a2e22]', star: '4.6', views: '22K',   genre: 'ตลก',            bg: 'from-[#5C469C] to-[#3a2080]' },
    { title: 'ลมหายใจสุดท้าย',        author: 'สุดา ป.',          icon: '🍃', tags: ['ซึ้ง', 'โรแมนติก'],         badge: '',     badgeClass: '',                             star: '4.8', views: '67K',   genre: 'ซึ้ง',           bg: 'from-[#1D267D] to-[#0C134F]' },
  ];


  constructor(
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit() {
    this.userService.loadProfile();


    this.userService.currentUser$.subscribe({
      next: (user: any) => {
        this.currentUser = user;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.log('ยังไม่ได้เข้าสู่ระบบ หรือ Token หมดอายุ', err);
        this.cdr.detectChanges();
      }
    });
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
  }

  get filteredBooks(): Book[] {
    if (this.selectedTag) {
      return this.books.filter(b => b.tags.includes(this.selectedTag) || b.genre === this.selectedTag);
    }
    return this.books;
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  setCategory(cat: string) {
    this.selectedCat = cat;
    this.selectedTag = '';
  }

  filterByTag(tag: string) {
    this.selectedTag = this.selectedTag === tag ? '' : tag;
  }

  onSearch() {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      this.searchResults = [];
      this.searchDone = false;
      return;
    }
    this.searchResults = this.books.filter(b =>
      b.title.includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.tags.some(t => t.includes(q)) ||
      b.genre.includes(q)
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
    if (!target.closest('input') && !target.closest('#search-results')) {
      
    }
  }
}