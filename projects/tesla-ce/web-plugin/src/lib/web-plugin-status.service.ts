import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WebPluginService } from './web-plugin.service';
import {SensorsService} from '@tesla-ce/sensors';

export interface SensorsStatus {
  camera: number;
  microphone: number;
  keyboard: number;
  assessment: number;
}

export interface NetworkStatus {
  status: number;
  speed: number;
}

export interface ConsentStatus {
  accepted: boolean;
  accepted_at: Date;
  rejected: boolean;
  rejected_at: Date;
}

export interface Notification {
  type: string;
  notificationId: string;
  when: Date;
}

@Injectable({
  providedIn: 'root'
})
export class WebPluginStatusService {
  private sensors = new BehaviorSubject<SensorsStatus>(null);
  private network = new BehaviorSubject<NetworkStatus>(null);
  private consent = new BehaviorSubject<ConsentStatus>(null);
  private notifications = new BehaviorSubject<Array<Notification>>(null);
  private dataStore: {sensors: SensorsStatus, network: NetworkStatus, consent: ConsentStatus, notifications: Array<Notification>} = {
    sensors: {
      camera: 0,
      microphone: 0,
      keyboard: 0,
      assessment: 0
    }, network: {
      status: 0,
      speed: null
    }, consent: {
      accepted: false,
      accepted_at: null,
      rejected: false,
      rejected_at: null
    }, notifications: []
  };
  readonly sensorsStatus = this.sensors.asObservable();
  readonly networkStatus = this.network.asObservable();
  readonly consentStatus = this.consent.asObservable();
  readonly systemNotifications = this.notifications.asObservable();
  private ready = false;

  constructor(private pluginService: WebPluginService, private sensorService: SensorsService) {
    this.pluginService.configChange.subscribe(value => {
      this.initialize();
    });
    this.sensorService.statusChange.subscribe( status => {
      if (status) {
        this.dataStore.sensors.camera = status.camera;
        this.dataStore.sensors.microphone = status.microphone;
        this.dataStore.sensors.keyboard = status.keyboard;
        this.dataStore.sensors.assessment = status.assessment;
        this.sensors.next(Object.assign({}, this.dataStore).sensors);
      }
    });
  }

  public isReady(): boolean {
    return this.ready;
  }

  public initialize(): void {
    if (!this.pluginService.isReady()) {
      return;
    }

    // Load consent status data
    if (this.pluginService.getStoredData('consent')) {
      this.dataStore.consent = this.pluginService.getStoredData('consent');
    }

    // Initialize the sensor status
    const sensors = this.pluginService.getSensors();

    if (sensors.hasOwnProperty('camera')) {
      this.dataStore.sensors.camera = 1;
    }
    if (sensors.hasOwnProperty('keyboard')) {
      this.dataStore.sensors.keyboard = 1;
    }
    if (sensors.hasOwnProperty('microphone')) {
      this.dataStore.sensors.microphone = 1;
    }
    if (sensors.hasOwnProperty('assessment')) {
      this.dataStore.sensors.assessment = 1;
    }

    // Load alerts data
    if (this.pluginService.getStoredData('notifications')) {
      this.dataStore.notifications = this.pluginService.getStoredData('notifications');
    }

    // Load network status
    if (this.pluginService.getStoredData('network')) {
      this.dataStore.network = this.pluginService.getStoredData('network');
    }

    this.sensors.next(Object.assign({}, this.dataStore).sensors);
    this.network.next(Object.assign({}, this.dataStore).network);
    this.consent.next(Object.assign({}, this.dataStore).consent);
    this.notifications.next(Object.assign({}, this.dataStore).notifications);

    this.consentStatus.subscribe(value => {
      this.pluginService.setStoredData('consent', this.dataStore.consent);
    });
    this.networkStatus.subscribe(value => {
      this.pluginService.setStoredData('network', this.dataStore.network);
    });
    this.systemNotifications.subscribe(value => {
      this.pluginService.setStoredData('notifications', this.dataStore.notifications);
    });

    this.ready = true;
  }

  public getCameraStatus() {
    return this.dataStore.sensors.camera;
  }

  public getMicStatus() {
    return this.dataStore.sensors.microphone;
  }

  public getKeyboardStatus() {
    return this.dataStore.sensors.keyboard;
  }

  public getAssessmentStatus() {
    return this.dataStore.sensors.assessment;
  }

  public getNetworkStatus() {
    return this.dataStore.network.status;
  }

  public getConsentStatus() {
    return this.dataStore.consent;
  }

  public getNotifications() {
    return this.dataStore.notifications;
  }

  public setCameraStatus(status) {
    this.dataStore.sensors.camera = status;
    this.sensors.next(Object.assign({}, this.dataStore).sensors);
  }

  public setMicStatus(status) {
    this.dataStore.sensors.microphone = status;
    this.sensors.next(Object.assign({}, this.dataStore).sensors);
  }

  public setKeyboardStatus(status) {
    this.dataStore.sensors.keyboard = status;
    this.sensors.next(Object.assign({}, this.dataStore).sensors);
  }

  public setAssessmentStatus(status) {
    this.dataStore.sensors.assessment = status;
    this.sensors.next(Object.assign({}, this.dataStore).sensors);
  }

  public setNetworkStatus(status) {
    this.dataStore.network.status = status;
    this.network.next(Object.assign({}, this.dataStore).network);
  }

  public setNetworkSpeed(speed) {
    this.dataStore.network.speed = speed;
    this.network.next(Object.assign({}, this.dataStore).network);
  }

  public acceptConsent() {
    this.dataStore.consent.accepted = true;
    this.dataStore.consent.rejected = false;
    this.dataStore.consent.accepted_at = new Date();
    this.dataStore.consent.rejected_at = null;
    this.consent.next(Object.assign({}, this.dataStore).consent);
  }

  public rejectConsent() {
    this.dataStore.consent.accepted = false;
    this.dataStore.consent.rejected = true;
    this.dataStore.consent.accepted_at = null;
    this.dataStore.consent.rejected_at = new Date();
    this.consent.next(Object.assign({}, this.dataStore).consent);
  }

  public addNotification(type: string, notificationId: string) {
    const notification: Notification = {type, notificationId, when: new Date()};
    this.dataStore.notifications.push(notification);
    this.notifications.next(Object.assign({}, this.dataStore).notifications);
  }

  public clearNotifications() {
    this.dataStore.notifications = [];
    this.notifications.next(Object.assign({}, this.dataStore).notifications);
  }
}
