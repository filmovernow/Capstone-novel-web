// src/app/guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from './service/user.service';
import { first, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    const token = localStorage.getItem('token');
    
    if (!token) {
      this.router.navigate(['/']);
      return false;
    }

    const currentUser = this.userService.getCurrentUser();
    
    if (currentUser) {
      // ✅ ใช้ optional chaining และ type assertion
      if ((currentUser as any).role === 'admin' || (currentUser as any).username === 'admin') {
        return true;
      }
      this.router.navigate(['/']);
      return false;
    }

    return this.userService.currentUser$.pipe(
      first(user => user !== null),
      map(user => {
        // ✅ ใช้ optional chaining
        if (user && ((user as any).role === 'admin' || (user as any).username === 'admin')) {
          return true;
        }
        this.router.navigate(['/']);
        return false;
      })
    );
  }
}