// src/app/guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from './service/user.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const user = this.userService.getCurrentUser();
    
    // ✅ ตรวจสอบ role หรือ username
    if (user && (user.role === 'admin' || user.username === 'admin')) {
      return true;
    }
    
    // ✅ ถ้าไม่มี token หรือไม่ใช่ admin ให้กลับหน้า home
    this.router.navigate(['/']);
    return false;
  }
}