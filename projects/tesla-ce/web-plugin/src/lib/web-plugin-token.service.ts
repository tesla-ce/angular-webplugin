import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { WebPluginService, TeSLAJWTToken } from './web-plugin.service';
import { catchError, retry } from 'rxjs/operators';
import { timer } from 'rxjs';
import {WebPluginStatusService} from './web-plugin-status.service';

export interface TokenPayload {
  iss: string;
  iat: number;
  exp: number;
  group: string;
  pk: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebPluginTokenService {
  private token = new BehaviorSubject<TeSLAJWTToken>(null);
  readonly tokenChange = this.token.asObservable();
  private currentToken: TeSLAJWTToken;
  private expiration: Date;
  private maxExpiration: Date;
  private refreshURL: string;
  private refreshTimer = null;

  constructor(@Inject(WebPluginService) private config,
              @Inject(WebPluginStatusService) private statusService,
              private http: HttpClient) {
    this.refreshURL = this.config.getApiURL() + '/api/v2/auth/token/refresh';
    this.setToken(config.getToken());
    if (this.isExpired()) {
      this.refreshToken().subscribe(resp => {
        this.setToken(resp.token);
      });
    }
  }

  public setToken(token: TeSLAJWTToken): void {
    if (this.refreshTimer !== null) {
      this.refreshTimer.unsubscribe();
    }
    this.currentToken = token;
    this.expiration = this.getExpiration();
    this.maxExpiration = this.getMaxExpiration();
    if (this.isExpired() && !this.isRefreshable()) {
      this.statusService.addNotification('error', 'NOTIFICATION.SESSION_EXPIRED');
    }
    // Program a timer to refresh the token 30 seconds before expiration
    const refreshDelay = (new Date(this.expiration).getTime() - new Date().getTime()) - 30 * 1000;
    const source = timer(refreshDelay);
    this.refreshTimer = source.subscribe(val => {
      this.refreshToken().subscribe(
        resp => {
          this.setToken(resp.token);
        }
      );
    });
    // Notify token change
    this.token.next(Object.assign({}, token));
  }

  public getToken(): TeSLAJWTToken {
    return Object.assign({}, this.currentToken);
  }

  private decodeToken(token: string): TokenPayload {
    if (token === null || token.split('.').length !== 3) {
      console.error('Invalid token');
      return null;
    }
    const parts = token.split('.');
    let decoded;
    try {
      decoded = JSON.parse(atob(parts[1]));
    } catch (e) {
      return null;
    }

    return decoded;
  }

  public isRefreshable(): boolean {
    if (this.currentToken.refresh_token !== null && this.maxExpiration > new Date()) {
      return true;
    }
    return false;
  }

  public isExpired(): boolean {
    return this.expiration <= new Date();
  }

  public needRefresh(timeToExpire: number = 30) {
    return (new Date(this.expiration).getTime() - new Date().getTime()) < timeToExpire * 1000;
  }

  public getExpiration(): Date {
    const payload = this.decodeToken(this.currentToken.access_token);
    let expiration = null;
    if (payload !== null) {
      expiration = payload.exp * 1000;
    }
    return new Date(expiration);
  }

  public getMaxExpiration(): Date {
    const payload = this.decodeToken(this.currentToken.refresh_token);
    let expiration = null;
    if (payload !== null) {
      expiration = payload.exp * 1000;
    }
    return new Date(expiration);
  }

  private refreshToken(): Observable<any> {
    if (!this.isRefreshable()) {
      return throwError('Token is not refreshable');
    }
    const options = {
      observe: 'body' as const,
      responseType: 'json' as const,
      headers: new HttpHeaders({
        Authorization: 'JWT ' + this.currentToken.refresh_token,
        'Content-type': 'application/json; charset=utf-8'
      })
    };
    return this.http.post<TeSLAJWTToken>(this.refreshURL, {
      token: this.currentToken.access_token
    }, options).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an observable with a user-facing error message
    return throwError(
      'Something bad happened; please try again later.');
  }
}
