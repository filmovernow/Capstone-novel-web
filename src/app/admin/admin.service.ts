// src/app/admin/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  status: string;
  coin_balance: number;
  created_at: string;
  avatar_path?: string;
}

export interface UsersResponse {
  total: number;
  users: User[];
}

export interface Novel {
  id: number;
  title: string;
  pen_name: string;
  status: string;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
  user_id: number;
  cover_path?: string;
  description?: string;
  genres?: any[];
}

export interface NovelsResponse {
  total: number;
  novels: Novel[];
}

export interface Withdrawal {
  id: number;
  user_id: number;
  username: string;
  amount: number;
  bank_name: string;
  bank_account: string;
  status: string;
  created_at: string;
}

export interface WithdrawalsResponse {
  total: number;
  withdrawals: Withdrawal[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:3000/api/v1/admin';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ======================= USERS =======================
  getUsers(): Observable<UsersResponse> {
    return this.http.get<UsersResponse>(`${this.apiUrl}/users`, { headers: this.getHeaders() });
  }

  updateUserStatus(userId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}`, { status }, { headers: this.getHeaders() });
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`, { headers: this.getHeaders() });
  }

  // ======================= NOVELS =======================
  getNovels(status?: string): Observable<NovelsResponse> {
    let url = `${this.apiUrl}/novels`;
    if (status) url += `?status=${status}`;
    return this.http.get<NovelsResponse>(url, { headers: this.getHeaders() });
  }

  updateNovelStatus(novelId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/novels/${novelId}`, { status }, { headers: this.getHeaders() });
  }

  deleteNovel(novelId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/novels/${novelId}`, { headers: this.getHeaders() });
  }

  // ======================= WITHDRAWALS =======================
  getWithdrawals(status?: string): Observable<WithdrawalsResponse> {
    let url = `${this.apiUrl}/withdrawals`;
    if (status) url += `?status=${status}`;
    return this.http.get<WithdrawalsResponse>(url, { headers: this.getHeaders() });
  }

  updateWithdrawalStatus(withdrawalId: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/withdrawals/${withdrawalId}`, { status }, { headers: this.getHeaders() });
  }

  deleteWithdrawal(withdrawalId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/withdrawals/${withdrawalId}`, { headers: this.getHeaders() });
  }
}