import {Injectable} from '@angular/core';
import {Subscription, timer} from 'rxjs';
import {MultiSensor, SensorStatusValue} from './sensor.interfaces';
import {BlackImageWorker} from './black-image.worker';

@Injectable({
  providedIn: 'root'
})
export class SensorWebcamService extends MultiSensor {
  cameraTimer: Subscription;
  microphoneTimer: Subscription;
  videoLabel = null;
  videoReady = false;
  timeBetweenPictures = 30000;
  timeBetweenAudios = 30000;
  timeAudioSample = 12000;
  result = 0;
  canvas = null;
  video = null;
  audio = null;
  audioLabel = null;
  audioBuffer = {
    recording: false,
    should_stop: false,
    media_recorder: null,
    source: null,
    recorded_chunks: []
  };

  private blackWorker = null;
  private inAudioFragment = false;
  private workersAvailaible = true;

  constructor() {
    super();

    this.codes = ['camera', 'microphone'];

    this.canvas = document.getElementById('webcamSensorCanvas');
    this.video = document.getElementById('webcamVideo');
    this.audio = document.getElementById('webcamAudio');
    // https://blog.logrocket.com/how-to-execute-a-function-with-a-web-worker-on-a-different-thread-in-angular/
    if (typeof Worker !== 'undefined') {
      // Create a new
      const biw = new BlackImageWorker();
      const blob = new Blob(['(this.onmessage=', biw.processImage.toString(), ')'], { type: 'text/javascript' });
      this.blackWorker = new Worker((<any>window).URL.createObjectURL(blob));

      this.blackWorker.onmessage = ({data}) => {
        if (data.black === true) {
          console.log('Back image detected');
          this.setStatus('camera', SensorStatusValue.warning);
          this.newWebcamEvent('error', 'NOTIFICATION.SENSOR.WEBCAM.BLACK_IMAGE');
        } else {
          // It is not a black image
          console.log('New sample, it will be processed.');
          this.setStatus('camera', SensorStatusValue.ok);
          this.newSample('camera', data.dataToSend.data, data.dataToSend.mimeType, data.dataToSend.context);
        }
      };


    } else {
      this.workersAvailaible = false;
      // todo: this is an alert?
      console.log('Web Workers are not supported in this environment.');
      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
    }


    this.configChange.subscribe( configs => {
      if (configs) {
        configs.forEach(element => {
          if (element.key === 'timeBetweenPictures') {
            this.timeBetweenPictures = parseInt(element.value, 10);
          } else if (element.key === 'timeBetweenAudios') {
            this.timeBetweenAudios = parseInt(element.value, 10);
          }
        });
      }
    });
  }

  private takePicture(): void {
    const canvasContext = this.canvas.getContext('2d');
    // check black image & send or alert
    const wTc = this.canvas.width;
    const hTc = this.canvas.height;
    canvasContext.drawImage(this.video, 0, 0, wTc, hTc);

    const mimeType = 'image/jpeg';
    const data64 = this.canvas.toDataURL(mimeType);

    const context = {
      webcam: this.videoLabel,
      source: 'webcam'
    };

    const data = canvasContext.getImageData(wTc / 4, hTc / 4, wTc / 2, hTc / 2);
    const dataToSend = {data: data64, context, mimeType};

    if (this.workersAvailaible === true) {
      this.blackWorker.postMessage({data: data.data, wTc, hTc, dataToSend});
    } else {
      // send without analize
      this.newSample('camera', dataToSend.data, mimeType, dataToSend.context);
    }
  }

  public start() {
    super.start();

    if (this.running) {
      const constrains = {video: false, audio: false};
      if (this.enabledSensors.includes('camera')) {
        constrains.video = true;
      }

      if (this.enabledSensors.includes('microphone')) {
        constrains.audio = true;
      }

      this.startWebcam(constrains);
    }
  }

  protected startAudioFragmentCapture() {
    /*
    if (this.inAudioFragment) {
      return;
    }
    this.inAudioFragment = true;
    */
    console.log('startAudioFragmentCapture');
    this.audioBuffer.media_recorder.start();
  }

  protected endAudioFragmentCapture() {
    console.log('endAudioFragmentCapture');
    if (this.audioBuffer.recording === true) {
      this.audioBuffer.media_recorder.stop();
    }
    // this.audioBuffer.should_stop = true;
    /*
    if (!this.inAudioFragment) {
      return;
    }
    const context = {
      webcam: 'my webcam'
    };
    this.newSample('microphone', 'my audio', 'wav', context);
    this.inAudioFragment = false;
    */
  }

  public stop() {
    super.stop();
    if (this.enabledSensors.includes('camera')) {
      this.cameraTimer.unsubscribe();
      this.setStatus('camera', SensorStatusValue.error);
    }
    if (this.enabledSensors.includes('microphone')) {
      this.microphoneTimer.unsubscribe();
      this.endAudioFragmentCapture();
      this.setStatus('microphone', SensorStatusValue.error);
    }
  }

  private startWebcam(constrains) {
    // Check browser compatibility
    if(navigator.mediaDevices === undefined || navigator.mediaDevices.getUserMedia === undefined)  {
      console.log('Browser not supported');
      this.newWebcamEvent('error', 'NOTIFICATION.SENSOR.WEBCAM.BROWSER_INCOMPATIBILITY');
      return;
    }

    // Start media device
    navigator.mediaDevices.getUserMedia(constrains).then( stream => {
        if (constrains.video === true) {
          this.videoLabel = stream.getVideoTracks()[0].label;
          this.video.srcObject = stream;
          this.video.muted = true;
          this.video.play();
        }

        if (constrains.audio === true) {
          const options = {mimeType: 'audio/webm'};

          this.audioBuffer.source = stream;
          this.audioBuffer.media_recorder = new MediaRecorder(stream, options);
          this.audioBuffer.recorded_chunks = [];
          this.audioBuffer.recording = false;
          this.audioBuffer.should_stop = false;

          if (this.enabledSensors.includes('microphone')) {
            this.microphoneTimer = timer(1000, this.timeBetweenAudios).subscribe(_ => {
              this.startAudioFragmentCapture();
              timer(this.timeAudioSample).subscribe(val => {
                this.endAudioFragmentCapture();
              });
            });
            this.setStatus('microphone', SensorStatusValue.ok);
          }

          this.audioBuffer.media_recorder.addEventListener('dataavailable', e => {
            if (e.data.size > 0) {
              this.audioBuffer.recorded_chunks.push(e.data);
            }
          });

          this.audioBuffer.media_recorder.addEventListener('stop', () => {
            const mimeType = 'audio/webm';
            const audioBlob = new Blob(this.audioBuffer.recorded_chunks, {type: mimeType});
            const reader = new FileReader();

            this.audioBuffer.recording = false;
            this.audioBuffer.should_stop = false;

            reader.readAsDataURL(audioBlob);
            reader.onloadend = (e) => {
              const base64data = reader.result;
              const context = {
                webcam: this.audioLabel,
                source: 'webcam'
              };

              this.newSample('microphone', String(base64data), mimeType, context);
            };
          });

          this.audioBuffer.media_recorder.addEventListener('start', () => {
            this.audioBuffer.recorded_chunks = [];
            this.audioBuffer.recording = true;
          });


        }
      }).catch( err => {
        if(err.name === 'PermissionDeniedError' || err.name === 'NotAllowedError') {
          console.log('Access to webcam denied');

          this.newWebcamEvent('error', 'NOTIFICATION.SENSOR.WEBCAM.PERMISSION_DENIED');
        } else if(err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          console.log('No webcam detected');
          this.newWebcamEvent('error', 'NOTIFICATION.SENSOR.WEBCAM.WEBCAM_NOT_FOUND');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          console.log('Webcam in use by another application');
          this.newWebcamEvent('error', 'NOTIFICATION.SENSOR.WEBCAM.WEBCAM_LOCKED');
        } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
          this.newWebcamEvent('error', 'NOTIFICATION.SENSOR.WEBCAM.WEBCAM_NOT_SATISFIED_CONSTRAINS');
        } else if (err.name === 'TypeError' || err.name === 'TypeError') {
          this.newWebcamEvent('error', 'NOTIFICATION.SENSOR.WEBCAM.WEBCAM_EMPTY_CONSTRAINS');
        } else {
          console.log('Webcam access error: ' + err.name);
          this.newWebcamEvent('error', 'NOTIFICATION.SENSOR.WEBCAM.WEBCAM_ERROR');
        }
      });

    // Add a listener to detect when the video is ready to start capturing
    this.video.addEventListener('canplay', ev => {
      if (!this.videoReady) {
        this.videoReady = true;

        if (this.enabledSensors.includes('camera')) {
          this.cameraTimer = timer(1000, this.timeBetweenPictures).subscribe(_ => {
            if (this.running) {
              this.takePicture();
            }
          });
          this.setStatus('camera', SensorStatusValue.ok);
        }
      }
    }, false);
  }

  private newWebcamEvent(level, code) {
    console.log('New webcam event throw it');
    console.log(level, code);
    if (this.enabledSensors.includes('camera')) {
      this.newEvent(level, code, 'camera');
    }

    if (this.enabledSensors.includes('microphone')) {
      this.newEvent(level, code, 'microphone');
    }
  }
}

