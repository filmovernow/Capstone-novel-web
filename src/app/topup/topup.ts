import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';  // ✅ เพิ่ม ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UserService } from '../service/user.service';

@Component({
  selector: 'app-topup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './topup.html',
})
export class TopupComponent implements OnInit {

  currentUser: any = null;
  amount: number | null = null;
  isLoading = false;
  errorMessage = '';
  profileOpen = false;

  private apiUrl = 'http://localhost:3000/api/v1';

  constructor(
    private userService: UserService,
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef  
  ) {}

  ngOnInit() {
    this.userService.loadProfile();
    this.userService.currentUser$.subscribe(user => {
      if (user && user.avatar_path) {
        user.avatar_path = user.avatar_path.split('?')[0] + `?t=${Date.now()}`;
      }
      this.currentUser = user;
      this.cdr.detectChanges();
    });
  }

  onAmountChange() {
    this.errorMessage = '';
    if (this.amount && this.amount < 10) {
      this.errorMessage = 'ขั้นต่ำ 10 บาท';
    }
    this.cdr.detectChanges();
  }

  getCoins(): number {
    if (this.amount && this.amount >= 10) {
      return this.amount;
    }
    return 0;
  }

  goBack() {
    this.router.navigate(['/']);
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
    this.cdr.detectChanges();
  }

  logout() {
    this.userService.logout();
    this.router.navigate(['/auth']);
  }

  formatNumber(value: number): string {
    if (value === undefined || value === null) return '0';
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toString();
  }

  async processPayment() {
    const totalAmount = this.amount;
    
    if (!totalAmount || totalAmount < 10) {
      this.errorMessage = 'กรุณากรอกจำนวนเงินที่ต้องการเติม (ขั้นต่ำ 10 บาท)';
      return;
    }
    
    this.isLoading = true;
    
    try {
      const response: any = await this.http.post(`${this.apiUrl}/user/topup/create-checkout-session`, {
        amount: totalAmount,
        success_url: window.location.origin + '/topup/success',
        cancel_url: window.location.origin + '/topup'
      }, {
        headers: this.getHeaders()
      }).toPromise();
      
      if (response.url) {
        window.location.href = response.url;
      }
      
    } catch (error: any) {
      this.errorMessage = error.error?.error || 'เกิดข้อผิดพลาด';
      this.isLoading = false;
    }
  }
  

  redirectToStripeCheckout(clientSecret: string, amount: number) {
    // ใช้ Stripe Checkout แทน
    // หรือใช้ Stripe Elements ในหน้าเดียวกัน
    
    // วิธีง่าย: redirect ไปหน้า checkout
    const stripe = (window as any).Stripe('YOUR_PUBLISHABLE_KEY');
    stripe.redirectToCheckout({
      sessionId: clientSecret
    });
  }

    private getHeaders() {
      const token = localStorage.getItem('token');
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }

    @HostListener('document:click', ['$event'])
    onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('#profile-wrapper')) {
        this.profileOpen = false;
        this.cdr.detectChanges();  // ✅ อัพเดท UI
      }
    }
  }