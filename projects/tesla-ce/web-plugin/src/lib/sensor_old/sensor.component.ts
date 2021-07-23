import {Component, Inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy} from '@angular/core';
import {SensorService} from './sensor.service';


/** @dynamic */
@Component({
  selector: 'lib-sensor',
  templateUrl: './sensor.component.html',
  styleUrls: [
    './sensor.component.scss'
  ],
})
export class SensorComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('webcamSensorCanvas') canvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('webcamSensorVideo') video: ElementRef<HTMLVideoElement>;
  public canvasWidth = 640;
  public canvasHeight = 480;

  constructor(@Inject(SensorService) private sensorService: SensorService) {

  }

  public ngOnInit(): void {

  }

  public ngAfterViewInit(): void {

  }

  public ngOnDestroy(): void {

  }
}
