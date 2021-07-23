export class BlackImageWorker {
  processImage = function(evt) {
    console.log('start check black image');

    const THRESHOLD_BRIGHTNESS = 30;

    const data = evt.data.data;
    const wTc = evt.data.wTc;
    const hTc = evt.data.hTc;
    const dataToSend = evt.data.dataToSend;

    let black = false;
    let colorSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // var alpha = data[i+3];
      colorSum += Math.floor((r + g + b) / 3);
    }
    const brightness = Math.floor(colorSum / (wTc / 2 * hTc / 2));

    if (brightness < THRESHOLD_BRIGHTNESS) {
      black = true;
    }

    this.postMessage({black, dataToSend});
  };
}
