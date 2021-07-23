import { NgModule } from '@angular/core';

import { SensorComponent } from './sensor.component';
import {SensorService} from './sensor.service';

@NgModule({
  declarations: [
    SensorComponent,
  ],
  imports: [
  ],
  exports: [SensorComponent],
  providers: [
    SensorService,
  ],
})
export class SensorModule { }
