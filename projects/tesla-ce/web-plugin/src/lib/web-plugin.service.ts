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

export interface TeSLAConfiguration {
  api_url: string;
  dashboard_url: string;
  logo_url: string;
  mode: 'enrolment' | 'verification';
  learner: object;
  session_id: number;
  activity: object;
  accessibility: object;
  instruments: object;
  token: TeSLAJWTToken;
  enrolment: object;
  launcher: object;
  base_url: string;
  locale: string;
}

export interface StoredData {
  sensors: SensorsStatus;
  network: NetworkStatus;
  consent: ConsentStatus;
  notifications: Array<Notification>;
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
  private keyPrefix: string;
  private config = new BehaviorSubject<TeSLAConfiguration>(null);
  private currentConfig = {
    api_url: null,
    dashboard_url: null,
    logo_url: null,
    mode: null,
    learner: null,
    session_id: null,
    activity: null,
    accessibility: null,
    instruments: [],
    sensors: {},
    token: null,
    enrolment: null,
    launcher: null,
    base_url: '.',
    locale: null,
    options: {
      floating_menu_initial_pos: 'top-right'
    }
  };
  private storedData: StoredData;
  readonly configChange = this.config.asObservable();
  private ready = false;
  private capturing = false;

  constructor(@Inject(DOCUMENT) private document, private http: HttpClient, private storage: StorageMap,
              private sensors: SensorsService) {
    this.storedData = {
      sensors: null,
      network: null,
      consent: null,
      notifications: []
    };

  }

  public load(): Observable<any> {
    const rootElement = this.document.getElementsByTagName('tesla-web-plugin');
    if (rootElement.length === 0) {
      console.error('Missing root tesla-web-plugin element');
      return null;
    } else if (rootElement.length > 1) {
      console.error('Multiple root tesla-web-plugin elements found');
    }
    if (!rootElement.item(0).attributes.hasOwnProperty('data-url')) {
      console.error('Missing data-url argument on root element');
    } else {
      const dataUrl = rootElement.item(0).attributes.getNamedItem('data-url').value;
      return this.http.get(dataUrl).pipe(
        flatMap(configData => {
          Object.assign(this.currentConfig, configData);
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
      return this.currentConfig.dashboard_url + '/ui/auth/launcher?id=' + this.currentConfig.launcher.id + '&token=' +
        this.currentConfig.launcher.token;
    }
    return this.currentConfig.dashboard_url;
  }

  public getInstruments() {
    return this.currentConfig.instruments;
  }

  public getSensors() {
    return this.currentConfig.sensors;
  }

  public getSensorInstruments(sensor) {
    if (!this.currentConfig.sensors.hasOwnProperty(sensor)) {
      return null;
    }
    return this.currentConfig.sensors[sensor];
  }

  public getSessionId() {
    return this.currentConfig.session_id;
  }

  public getLearner() {
    return this.currentConfig.learner;
  }

  public getActivity() {
    return this.currentConfig.activity;
  }

  public getAssetsBaserUrl() {
    return this.currentConfig.base_url + 'assets/';
  }

  public getBaserUrl() {
    return this.currentConfig.base_url;
  }

  public getLocale() {
    return this.currentConfig.locale;
  }

  public getMode() {
    return this.currentConfig.mode;
  }

  public getFloatingMenuPosition() {
    return this.currentConfig.options.floating_menu_initial_pos;
  }

  public getStoredData(key) {
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
