import {Injectable} from '@angular/core';
import {Sensor, SensorStatusValue} from './sensor.interfaces';
import {Observable, fromEvent, Subscription} from 'rxjs';
import {SensorComponent} from "./sensor.component";
import {TeslaKeyboard} from "./tesla-keyboard";

export interface KeyEvent {
  when: Date;
  key: string;
  code: number;
  event: 'keyup' | 'keydown';
}

@Injectable({
  providedIn: 'root'
})
export class SensorKeyboardService extends Sensor {
  private keyEvents: Subscription;
  private keyboard: TeslaKeyboard;
  private lastDownWasSpace: boolean;
  private lastUpWasSpace: boolean;
  private subscriptionUp: Subscription;
  private subscriptionDown: Subscription;
  private recording: boolean;
  private buffer: Array<{}>;
  private MAX_REPEATS = 125;

  constructor() {
    super();

    this.keyboard = new TeslaKeyboard();
    this.lastDownWasSpace = false;
    this.lastUpWasSpace = false;
    this.recording = false;
    this.buffer = [];
    this.code = 'keyboard';
  }

  public start() {
    console.log('Start keyboard recording');
    this.recording = true;

    // locale browser
    // user agent -> is_mobile
    // events {keycode, keyValue, timestamp, type}
    // 512 -> envio

    this.subscriptionUp = fromEvent(document, 'keyup').subscribe((ev: KeyboardEvent) => {
      return this.onKeyUp(ev);
    });

    this.subscriptionDown = fromEvent(document, 'keydown').subscribe((ev: KeyboardEvent) => {
      return this.onKeyDown(ev);
    })

    super.start();
    this.setStatus(SensorStatusValue.ok);
  }

  public stop() {
    this.recording = false;
    super.stop();
    this.setStatus(SensorStatusValue.error);
  }

  // @HostListener('window:keyup', ['$event'])
  onKeyUp(ev: KeyboardEvent) {
    // do something meaningful with it
    // console.log(`[UP] The user just pressed ${ev.key}!`);
    return this.processKey(ev);
  }

  // @HostListener('window:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent) {
    // do something meaningful with it
    // console.log(`[DOWN] The user just pressed ${ev.key}!`);
    return this.processKey(ev);
  }

  private processKey(ev: KeyboardEvent) {
    if (this.recording !== true) {
      return;
    }
    console.log(ev);
    const aux = {
      key: ev.key,
      code: ev.code,
      timestamp: ev.timeStamp,
      type: ev.type
    };

    this.buffer.push(aux);
    // console.log('buffer length: ' + this.buffer.length);

    if (this.buffer.length >= 250) {
      const context = {};
      console.log('Keyboard service: send buffer');
      this.newSample(JSON.stringify(this.buffer), 'plain/text', context);
      this.buffer = [];
    }
    /*
    // validate key
    const keyChar = this.keyboard.getCharacter(ev.key, ev.shiftKey);
    if (this.keyboard.isValidKey(keyChar) !== true &&
      this.keyboard.isValidKey(keyChar.toLowerCase()) !== true) {
      return;
    }

    // validate event
    if (this.validateEvent(keyChar, ev) === false) {
      return;
    }

    // put inside buffer
    if (this.buffer[ev.type][keyChar] === undefined) {
      this.buffer[ev.type][keyChar] = [];
    }

    if (this.buffer[ev.type][keyChar].length >= this.MAX_REPEATS) {
      console.log(`${ev.key} was discarted. MAX_REPEATS.`);
      return;
    }

    this.buffer[ev.type][keyChar].push(ev);
    console.log(`${ev.key} is valid`);
    // are there sufficient events?

    // create features and send data
    */

  }
  /*
  private validateEvent(keyChar, ev) {
    // remove ctrl, alt and shift events
    if (ev.ctrlKey === true || ev.altKey === true || keyChar === 'shift') {
      return false;
    }

    // control more than 1 space
    if (keyChar === 'space') {
      if (ev.type === 'keydown') {
        if (this.lastDownWasSpace === true) {
          return false;
        } else {
          this.lastDownWasSpace = true;
        }
      } else if(ev.type === 'keyup') {
        if (this.lastUpWasSpace === true) {
          return false;
        } else {
          this.lastUpWasSpace = true;
        }
      }
    }

    if (ev.type === 'keydown' && keyChar !== 'space') {
      this.lastDownWasSpace = false;
    }
    if (ev.type === 'keyup' && keyChar !== 'space') {
      this.lastDownWasSpace = false;
    }

    return true;
  }
  */
}
