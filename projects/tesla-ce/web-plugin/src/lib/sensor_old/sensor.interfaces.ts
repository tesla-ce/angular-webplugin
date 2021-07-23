import {BehaviorSubject, Observable} from 'rxjs';
import {WebPluginStatusService} from '../web-plugin-status.service';

export enum SensorStatusValue {
  disabled,
  unknown,
  ok,
  warning,
  error
}
export type SensorCode = 'camera' | 'microphone' | 'keyboard' | 'assessment';
export interface SensorStatus {
  sensor: SensorCode;
  status: SensorStatusValue;
}

export interface SensorCapturedData {
  sensor: SensorCode;
  b64data: string;
  mimeType: string;
  capturedAt: Date;
  context?: any;
}

export type SensorEventCode = 'error' | 'warning' | 'info';
export interface SensorEvent {
  level: SensorEventCode;
  code: string;
  sensor: SensorCode;
  capturedAt: Date;
  context?: any;
}

export interface SensorConfig {
  key: string;
  value: string;
}

export abstract class Sensor {
  private status = new BehaviorSubject<SensorStatus>(null);
  public readonly statusChange = this.status.asObservable();
  private event = new BehaviorSubject<SensorEvent>(null);
  public readonly eventChange = this.event.asObservable();
  private running = false;
  protected code: SensorCode;
  private sample = new BehaviorSubject<SensorCapturedData>(null);
  readonly newData: Observable<SensorCapturedData> = this.sample.asObservable();

  private config = new BehaviorSubject<Array<SensorConfig>>(null);
  public readonly configChange = this.config.asObservable();

  protected constructor() {
  }

  public start() {
    this.running = true;
  }

  public stop() {
    this.running = false;
  }

  public getCode(): SensorCode {
    return this.code;
  }

  protected setStatus(status: SensorStatusValue) {
    this.status.next(Object.assign({}, {sensor: this.getCode(), status}));
  }

  protected setConfig(config: Array<SensorConfig>) {
    this.config.next(Object.assign({}, config));
  }

  protected newSample(b64data: string, mimeType: string, context?: any) {
    this.sample.next(Object.assign({}, {sensor: this.getCode(), b64data, mimeType, capturedAt: new Date(), context}));
  }

  protected newEvent(level: SensorEventCode, code: string, context?: any) {
    this.event.next(Object.assign({}, {sensor: this.getCode(), level, capturedAt: new Date(), context, code}))
  }
}

export abstract class MultiSensor {
  private status = new BehaviorSubject<SensorStatus>(null);
  public readonly statusChange = this.status.asObservable();
  private event = new BehaviorSubject<SensorEvent>(null);
  public readonly eventChange = this.event.asObservable();
  protected running = false;
  protected codes: Array<SensorCode>;
  private sample = new BehaviorSubject<SensorCapturedData>(null);
  readonly newData: Observable<SensorCapturedData> = this.sample.asObservable();
  protected enabledSensors: Array<SensorCode>;
  protected statusService: WebPluginStatusService;
  private config = new BehaviorSubject<Array<SensorConfig>>(null);
  public readonly configChange = this.config.asObservable();

  protected constructor() {
    this.enabledSensors = new Array<SensorCode>();
  }

  public enableSensors(enabledSensors: Array<SensorCode>) {
    for (const sensor of enabledSensors) {
      if (this.getCodes().includes(sensor)) {
        this.enabledSensors.push(sensor);
      }
    }
  }

  public start() {
    this.running = true;
  }

  public stop() {
    this.running = false;
  }

  public getCodes(): Array<SensorCode> {
    return this.codes;
  }

  protected setStatus(sensor: SensorCode, status: SensorStatusValue) {
    this.status.next(Object.assign({}, {sensor, status}));
  }

  protected setConfig(config: Array<SensorConfig>) {
    this.config.next(Object.assign({}, config));
  }

  protected newSample(sensor: SensorCode, b64data: string, mimeType: string, context?: any) {
    this.sample.next(Object.assign({}, {sensor, b64data, mimeType, capturedAt: new Date(), context}));
  }

  protected newEvent(level: SensorEventCode, code: string, sensor: SensorCode, context?: any) {
    this.event.next(Object.assign({}, {sensor, level, capturedAt: new Date(), context, code}))
  }
}
