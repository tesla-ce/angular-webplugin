import { Inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  forkJoin,
  from,
  Observable,
  of,
  queueScheduler,
  scheduled, Subscription,
  throwError,
  timer
} from 'rxjs';
import {catchError, concatMap, retry} from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { WebPluginService, TeSLAJWTToken } from './web-plugin.service';
import { WebPluginTokenService } from './web-plugin-token.service';
import { WebPluginStatusService } from './web-plugin-status.service';
import { SensorEvent} from '@tesla-ce/sensors';


export interface DataMetadata {
  filename: string;
  mimetype: string;
  context?: object;
  created_at: Date;
}

export interface EnrolmentData {
  learner_id: string;
  data: string;
  instruments: Array<number>;
  metadata: DataMetadata;
}

export interface VerificationData {
  learner_id: string;
  course_id: number;
  activity_id: number;
  session_id?: number;
  data: string;
  instruments: Array<number>;
  metadata: DataMetadata;
}

export interface DataSample {
  type: 'enrolment' | 'verification';
  seq: number;
  institutionId: number;
  learnerId: string;
  body: EnrolmentData | VerificationData;
}

export interface AlertData {
  level: 'info' | 'warning' | 'alert' | 'error';
  learner_id: string;
  course_id: number;
  activity_id: number;
  message_code: string;
  session_id?: number;
  data: Object;
  instruments?: Array<number>;
  raised_at: string;
}

export interface AlertMessage {
  institutionId: number;
  learnerId: string;
  body: AlertData;
  seq: number;
}

export interface LAPISampleResponse {
  status: 'OK' | 'ERROR';
  path?: string;
  errors?: object;
}

export interface Buffer {
  seq: number;
  pending: Array<number>;
  sent: number;
  correct: number;
  failed: number;
  status: Array<string>;
}

@Injectable({
  providedIn: 'root'
})
export class WebPluginConnectionService {

  private apiUrl: string;
  private token: TeSLAJWTToken = {} as TeSLAJWTToken;
  private requests = new BehaviorSubject<DataSample>({} as DataSample);
  private alerts = new BehaviorSubject<AlertMessage>({} as AlertMessage);
  readonly newAlert = this.alerts.asObservable();
  readonly newRequest = this.requests.asObservable();
  private sendingAlerts = false;
  private sendingRequests = false;
  private senderTimer: Observable<number> = timer(0, 10000);
  private requestBuffer: Buffer = {
    seq: 0,
    pending: [],
    sent: 0,
    correct: 0,
    failed: 0,
    status: []
  };
  private alertBuffer: Buffer = {
    seq: 0,
    pending: [],
    sent: 0,
    correct: 0,
    failed: 0,
    status: []
  };
  private dataCapture: Subscription = {} as Subscription;
  private eventCapture: Subscription = {} as Subscription;

  constructor(@Inject(WebPluginService) private config: WebPluginService,
              @Inject(WebPluginTokenService) private tokenService: WebPluginTokenService,
              @Inject(WebPluginStatusService) private statusService: WebPluginStatusService,
              private http: HttpClient) {
    this.apiUrl = config.getApiURL();
    tokenService.tokenChange.subscribe((token: TeSLAJWTToken) => {
      this.token = token;
    });
    if (config.getStoredData('requests')) {
      Object.assign(this.requestBuffer, config.getStoredData('requests'));
    }
    if (config.getStoredData('alerts')) {
      Object.assign(this.alertBuffer, config.getStoredData('alerts'));
    }
    this.newAlert.subscribe((alert: AlertMessage) => {
      if (Object.keys(alert).length != 0) {
        this.config.setStoredAlert(alert.seq, Object.assign({}, alert)).subscribe(() => {
          this.alertBuffer.pending.push(alert.seq);
          this.config.setStoredData('alerts', Object.assign({}, this.alertBuffer));
        });
      }
    });
    this.newRequest.subscribe(request => {
      if (Object.keys(request).length != 0) {
        this.config.setStoredRequest(request.seq, Object.assign({}, request)).subscribe(() => {
          this.requestBuffer.pending.push(request.seq);
          this.config.setStoredData('requests', Object.assign({}, this.requestBuffer));
        });
      }
    });
    this.sendingAlerts = false;
    this.sendingRequests = false;
    this.senderTimer.subscribe( _ => {
        if (!this.tokenService.isExpired()) {
          this.initRequestSent();
          this.initAlertSent();
          this.getStatus();
        } else {
          this.statusService.setNetworkStatus(4);
        }
      }
    );
    this.dataCapture = this.config.sensors.newData.subscribe(data => {
        if (this.config.isCapturing()) {
          if (data && data.sensor) {
            this.sendRequest(this.config.getMode(), data.b64data, data.mimeType,
              this.config.getSensorInstruments(data.sensor), 'capture.webplugin', data.context);
          }
        }
      });

    this.eventCapture = this.config.sensors.eventChange.subscribe((data: SensorEvent) => {
      if (Object.keys(data).length > 0) {
        this.sendAlertMessage(data.level, data.code, data, this.config.getInstruments());
      }
    });
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

  private sendData(sample: DataSample | any): Observable<LAPISampleResponse | HttpResponse<LAPISampleResponse>> {
    const refreshURL = this.apiUrl + '/lapi/v1/' + sample.type + '/' +
      sample.institutionId + '/' + sample.learnerId + '/';
    const options = {
      observe: 'response' as const,
      responseType: 'json' as const,
      headers: new HttpHeaders({
        Authorization: 'JWT ' + this.token.access_token,
        'Content-type': 'application/json; charset=utf-8'
      })
    };
    return this.http.post<LAPISampleResponse>(refreshURL, sample.body, options).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  private sendAlert(sample: AlertMessage | any): Observable<LAPISampleResponse | HttpResponse<LAPISampleResponse>> {
    const refreshURL = this.apiUrl + '/lapi/v1/alert/' + sample.institutionId + '/' + sample.learnerId + '/';
    const options = {
      observe: 'response' as const,
      responseType: 'json' as const,
      headers: new HttpHeaders({
        Authorization: 'JWT ' + this.token.access_token,
        'Content-type': 'application/json; charset=utf-8'
      })
    };
    return this.http.post<LAPISampleResponse>(refreshURL, sample.body, options).pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  public sendRequest(type: 'enrolment' | 'verification', data: string, mimetype: string, instruments: Array<number>,
                     filename: string, context?: object): void {

    const metadata: DataMetadata = {
      mimetype,
      filename,
      created_at: new Date(),
      context,
    };

    let body: EnrolmentData | VerificationData;
    if (type === 'enrolment') {
      body = {
        learner_id: this.config.getLearner().learner_id,
        data,
        instruments,
        metadata,
      };
    } else {
      body = {
        learner_id: this.config.getLearner().learner_id,
        course_id: this.config.getActivity().course.id,
        activity_id: this.config.getActivity().id,
        session_id: this.config.getSessionId(),
        data,
        instruments,
        metadata,
      };
    }
    this.requestBuffer.seq++;

    const dataSample: DataSample = {
      type,
      institutionId: this.config.getLearner().institution_id,
      learnerId: this.config.getLearner().learner_id,
      body,
      seq: this.requestBuffer.seq
    };

    this.addRequest(dataSample);
  }

  public sendAlertMessage(level: 'info'|'warning'|'alert'|'error',
                          messageCode: string,
                          data: Object, instruments: Array<number> = []): void {

    const alertData: AlertData = {
      level,
      learner_id: this.config.getLearner().learner_id,
      course_id: this.config.getActivity().course.id,
      activity_id: this.config.getActivity().id,
      message_code: messageCode,
      session_id: this.config.getSessionId(),
      data,
      instruments,
      raised_at: new Date().toISOString()
    };
    this.alertBuffer.seq++;

    const alertMessage: AlertMessage = {
      institutionId: this.config.getLearner().institution_id,
      learnerId: this.config.getLearner().learner_id,
      body: alertData,
      seq: this.alertBuffer.seq
    };

    this.addAlert(alertMessage);
  }

  private addRequest(request: DataSample) {
    this.requests.next(Object.assign({}, request));
  }

  private addAlert(alert: AlertMessage) {
    this.alerts.next(Object.assign({}, alert));
  }

  private initRequestSent() {
    if (this.sendingRequests) {
      return;
    }

    this.sendingRequests = true;
    const start = Math.floor(Math.random() * Math.max(0, this.requestBuffer.pending.length - 10));

    scheduled(from(this.requestBuffer.pending.slice(start, 10)), queueScheduler)
      .pipe(
        concatMap(seq => this.config.getStoredRequest(seq)),
        concatMap(request => forkJoin([of<any>([request, ]), this.sendData(request).pipe(catchError( (error) => {
          return of(null);
        }))]))
      )
      .subscribe((result: Array<any>) => {
        const seq = result[0][0].seq;
        if (result[1]) {
          console.log('Request seq=' + seq + ' sent');
          this.requestBuffer.pending = this.requestBuffer.pending.filter(
            (value, index, arr) => value !== seq);
          this.requestBuffer.status.push(result[1].body.path);
          this.requestBuffer.sent++;
          this.config.setStoredData('requests', Object.assign({}, this.requestBuffer));
          this.config.deleteStoredRequest(seq);
          this.statusService.setNetworkStatus(1);
        } else {
          console.log('Request seq=' + seq + ' FAILED');
          this.statusService.setNetworkStatus(4);
        }
      }, _ => {
        this.statusService.setNetworkStatus(4);
      }, () => {
        this.sendingRequests = false;
        console.log('all pending requests sent');
      });
  }

  private initAlertSent() {
    if (this.sendingAlerts) {
      return;
    }
    this.sendingAlerts = true;
    const start = Math.floor(Math.random() * Math.max(0, this.alertBuffer.pending.length - 10));
    scheduled(from(this.alertBuffer.pending.slice(start, 10)), queueScheduler)
      .pipe(
        concatMap(seq => this.config.getStoredAlert(seq)),
        concatMap(alert => forkJoin([of<any>([alert, ]), this.sendAlert(alert).pipe(catchError( error => of(null)))]))
      )
      .subscribe((result: Array<any>) => {
        const seq = result[0][0].seq;
        if (result[1]) {
          console.log('Alert seq=' + seq + ' sent');
          this.alertBuffer.pending = this.alertBuffer.pending.filter(
            (value, index, arr) => value !== seq);
          this.alertBuffer.status.push(result[1].body.path);
          this.alertBuffer.sent++;
          this.config.setStoredData('alerts', Object.assign({}, this.alertBuffer));
          this.config.deleteStoredAlert(seq);
          this.statusService.setNetworkStatus(2);
        } else {
          console.log('Alert seq=' + seq + ' FAILED');
          this.statusService.setNetworkStatus(4);
        }
      }, _ => {
        this.statusService.setNetworkStatus(4);
      }, () => {
        this.sendingAlerts = false;
        console.log('all pending alerts sent');
      });
  }

  private getStatus(): void {
    const statusURL = this.apiUrl + '/lapi/v1/status/' + this.config.getLearner().institution_id
      + '/' + this.config.getLearner().learner_id + '/';
    const options = {
      observe: 'body' as const,
      responseType: 'json' as const,
      headers: new HttpHeaders({
        Authorization: 'JWT ' + this.token.access_token,
        'Content-type': 'application/json; charset=utf-8'
      })
    };
    const body = {
      learner_id: this.config.getLearner().learner_id,
      samples: this.requestBuffer.status.concat(this.alertBuffer.status)
    };

    if (body.samples.length === 0) {
      return;
    }

    this.http.post<any>(statusURL, body, options).pipe(
      catchError(this.handleError)
    ).subscribe(resp => {
      for (const stat of resp) {
        if (stat.status !== 'PENDING') {
          let index = this.requestBuffer.status.indexOf(stat.sample);
          if (index >= 0) {
            this.requestBuffer.status.splice(index, 1);
            if (stat.status === 'VALID') {
              this.requestBuffer.correct++;
            } else {
              this.requestBuffer.failed++;
            }
          } else {
            index = this.alertBuffer.status.indexOf(stat.sample);
            if (index >= 0) {
              this.alertBuffer.status.splice(index, 1);
              if (stat.status === 'VALID') {
                this.alertBuffer.correct++;
              } else {
                this.alertBuffer.failed++;
              }
            }
          }
        }
      }
      this.config.setStoredData('requests', Object.assign({}, this.requestBuffer));
      this.config.setStoredData('alerts', Object.assign({}, this.alertBuffer));
    });
  }
}
