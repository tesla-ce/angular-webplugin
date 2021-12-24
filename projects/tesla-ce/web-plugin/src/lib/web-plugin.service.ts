import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {BehaviorSubject, forkJoin, Observable, of, Subscription} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Notification, ConsentStatus, NetworkStatus, SensorsStatus } from './web-plugin-status.service';
import { StorageMap } from '@ngx-pwa/local-storage';
import { catchError, filter, flatMap, last, map, mergeMap } from 'rxjs/operators';

// import { SensorsService } from '../../../sensors/src/public-api';
import { SensorsService } from '@tesla-ce/sensors';
// import { SensorCode } from '../../../sensors/src/public-api';
import { SensorCode } from '@tesla-ce/sensors';


export interface TeSLAJWTToken {
  access_token: string;
  refresh_token: string;
}
export enum Mode{
  enrolment = 'enrolment',
  verification = 'verification'
}
export interface TeSLAConfigurationOptions{
  floating_menu_initial_pos: string
}
export interface TeSLALearner {
  id: number;
  learner_id: string;
  first_name: string;
  last_name: string;
  picture: string;
  institution_id: number;
  locale: string;
}
export interface TeSLACourse {
  id: number;
  code: string;
  description: string;
  start?: Date
  end?: Date
}
export interface TeSLAActivity {
  enabled: boolean;
  course: TeSLACourse;
  id: number;
  name: string;
  description: string;
  start?: Date
  end?: Date
  allow_reject_capture: boolean;
  redirect_reject_url?: string;
  rejected_message?: string;
  vle_id: number;
}
export interface TeSLAAccessibility {
  high_contrast: boolean;
  big_fonts: boolean;
  text_to_speech: boolean;
}
export interface TeSLAConfiguration {
  api_url: string;
  dashboard_url: string;
  logo_url: string;
  mode: Mode;
  learner: TeSLALearner;
  session_id: number;
  activity: TeSLAActivity;
  accessibility: TeSLAAccessibility;
  instruments: Array<number>;
  sensors: SensorIndex;
  token: TeSLAJWTToken;
  enrolment: object;
  launcher: object;
  base_url: string;
  locale: string;
  options: TeSLAConfigurationOptions;
}

export interface StoredData {
  [index: string]: any;
  sensors?: SensorsStatus;
  network?: NetworkStatus;
  consent?: ConsentStatus;
  notifications: Array<Notification>;
}

export interface SensorIndex{
  [index: string]: any;
}
export abstract class IconLoader {

  protected constructor(protected baseAssetsURL: string) {
  }

  public getIcon(path: string, extension: string = 'png') {
    return this.baseAssetsURL + 'icons/' + path + '.' + extension;
  }

  public getNotificationIcon(notification: Notification, extension: string = 'png') {
    return this.getIcon('notification/' + notification.type.toLowerCase(), extension);
  }

  public getSensorIcon(sensor: SensorCode, extension: string = 'png') {
    return this.getIcon('sensor/' + sensor.toLowerCase(), extension);
  }

  public getInstrumentIcon(instrument: number, extension: string = 'png') {
    let instrumentName = null;
    switch (instrument) {
      case 1: // Face Recognition
        instrumentName = 'fr';
        break;
      case 2: // Keystroke dynamics
        instrumentName = 'ks';
        break;
      case 3: // Voice Recognition
        instrumentName = 'vr';
        break;
      case 4: // Forensic Analysis
        instrumentName = 'fa';
        break;
      case 5: // Plagiarism
        instrumentName = 'plagiarism';
        break;
    }
    if (instrumentName !== null) {
      return this.getIcon('instrument/' + instrumentName, extension);
    }
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class WebPluginService {
  private keyPrefix: string = '';
  private config = new BehaviorSubject<TeSLAConfiguration>({} as TeSLAConfiguration);
  private currentConfig: TeSLAConfiguration = {
    api_url: '',
    dashboard_url: '',
    logo_url: '',
    mode: Mode.verification,
    learner: {} as TeSLALearner,
    session_id: 0,
    activity: {} as TeSLAActivity,
    accessibility: {} as TeSLAAccessibility,
    instruments: [],
    sensors: {} as SensorIndex,
    token: {} as TeSLAJWTToken,
    enrolment: {},
    launcher: {},
    base_url: '.',
    locale: '',
    options: {
      floating_menu_initial_pos: 'top-right'
    } as TeSLAConfigurationOptions
  } as TeSLAConfiguration;
  private storedData: StoredData;
  readonly configChange = this.config.asObservable();
  private ready = false;
  private capturing = false;

  constructor(@Inject(DOCUMENT) private document: Document, private http: HttpClient, private storage: StorageMap,
              public sensors: SensorsService) {
    this.storedData = {
      sensors: undefined,
      network: undefined,
      consent: undefined,
      notifications: []
    };

  }

  public load(): Observable<any> {
    const rootElement = this.document.getElementsByTagName('tesla-web-plugin');
    if (rootElement.length === 0 || rootElement === null) {
      console.error('Missing root tesla-web-plugin element');
      return of([]);
    } else if (rootElement.length > 1) {
      console.error('Multiple root tesla-web-plugin elements found');
      return of([]);
    }
    // @ts-ignore: Object is possibly 'null'.
    if (rootElement && rootElement.item(0)  && !rootElement.item(0).attributes.hasOwnProperty('data-url')) {
      console.error('Missing data-url argument on root element');
    } else {
      // @ts-ignore: Object is possibly 'null'.
      const dataUrl = rootElement.item(0).attributes.getNamedItem('data-url').value;
      return this.http.get(dataUrl).pipe(
        flatMap( configData => {
          Object.assign(this.currentConfig, configData as TeSLAConfiguration);

          if (this.currentConfig.learner === null) {
            console.error('Error in configuration, learner is missing');
            return of([]);
          }
          // @ts-ignore: Object is possibly 'null'.
          this.keyPrefix = 'tesla_' + this.currentConfig.learner.learner_id + '_' + this.currentConfig.session_id + '_';
          return this.storage.keys().pipe(
            filter((key) => key.startsWith(this.keyPrefix + 'data_')),
            mergeMap(key => forkJoin([of([key.split(this.keyPrefix)[1],]), this.storage.get(key)])),
            mergeMap(keyval => {
              this.storedData[keyval[0][0]] = keyval[1];
              return keyval;
            })).pipe(last(), map(() => {
            this.ready = true;
            console.log('TeSLA configuration ready');
          }), catchError(error => {
            this.ready = true;
            console.log('Error reading persistent data');
            return of([]);
          }));
        }));
    }
    return of([]);
  }

  public loadManualConfig(config: TeSLAConfiguration) {
    Object.assign(this.currentConfig, config);
    this.ready = true;
    console.log('TeSLA configuration ready');
  }

  public isReady() {
    return this.ready;
  }

  public setReady() {
    this.ready = true;
  }

  public getToken(): TeSLAJWTToken {
    return this.currentConfig.token;
  }

  public getApiURL() {
    return this.currentConfig.api_url;
  }

  public getDashboardUrl() {
    if (this.currentConfig.launcher) {
      // @ts-ignore: Object is possibly 'null'.
      return this.currentConfig.dashboard_url + '/ui/auth/launcher?id=' + this.currentConfig.launcher.id + '&token=' +
        // @ts-ignore: Object is possibly 'null'.
        this.currentConfig.launcher.token;
    }
    return this.currentConfig.dashboard_url;
  }

  public getInstruments(): Array<number> {
    return this.currentConfig.instruments;
  }

  public getSensors() {
    return this.currentConfig.sensors;
  }

  public getSensorInstruments(sensor: any) {
    if (!this.currentConfig.sensors.hasOwnProperty(sensor)) {
      return null;
    }
    return this.currentConfig.sensors[sensor];
  }

  public getSessionId() {
    return this.currentConfig.session_id;
  }

  public getLearner(): TeSLALearner {
    return this.currentConfig.learner;
  }

  public getActivity(): TeSLAActivity {
    return this.currentConfig.activity;
  }

  public getAssetsBaserUrl(): string {
    return this.currentConfig.base_url + 'assets/';
  }

  public getBaserUrl(): string {
    return this.currentConfig.base_url;
  }

  public getLocale(): string {
    return this.currentConfig.locale;
  }

  public getMode(): Mode {
    return this.currentConfig.mode;
  }

  public getFloatingMenuPosition(): string {
    return this.currentConfig.options.floating_menu_initial_pos;
  }

  public getStoredData(key: string) {
    return this.storedData['data_' + key];
  }

  public setStoredData(key: string, value: any) {
    this.storedData[key] = value;
    this.storage.set(this.keyPrefix + 'data_' + key, value).subscribe();
  }

  public setStoredRequest(seq: number, value: any): Observable<any> {
    return this.storage.set(this.keyPrefix + 'request_' + seq, value);
  }

  public getStoredRequest(seq: number): Observable<any> {
    return this.storage.get(this.keyPrefix + 'request_' + seq);
  }

  public setStoredAlert(seq: number, value: any): Observable<any> {
    return this.storage.set(this.keyPrefix + 'alert_' + seq, value);
  }

  public getStoredAlert(seq: number): Observable<any> {
    return this.storage.get(this.keyPrefix + 'alert_' + seq);
  }

  public deleteStoredRequest(seq: number): void {
    this.storage.delete(this.keyPrefix + 'request_' + seq).subscribe();
  }

  public deleteStoredAlert(seq: number): void {
    this.storage.delete(this.keyPrefix + 'alert_' + seq).subscribe();
  }

  public startDataCapture(): void {
    if (!this.capturing) {
      this.capturing = true;
      const enabledSensors = Array<SensorCode>();
      for (const sensorName of Object.getOwnPropertyNames(this.getSensors())) {
        if (sensorName === 'camera') {
          enabledSensors.push('camera');
        }
        if (sensorName === 'microphone') {
          enabledSensors.push('microphone');
        }
        if (sensorName === 'keyboard') {
          enabledSensors.push('keyboard');
        }
        if (sensorName === 'assessment') {
          enabledSensors.push('assessment');
        }
      }

      this.sensors.enableSensors(enabledSensors);
      this.sensors.start();

      console.log('TeSLA Data capturing started');
    }
  }

  public stopDataCapture(): void {
    if (this.capturing) {
      this.capturing = false;
      this.sensors.stop();
      console.log('TeSLA Data capturing stopped');
    }
  }

  public isCapturing(): boolean {
    return this.capturing;
  }

}
