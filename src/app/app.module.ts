import {Injector, NgModule} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { WebPluginModule, WebPluginComponent} from '../../projects/tesla-ce/web-plugin/src/public-api';
import { createCustomElement } from '@angular/elements';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
  ],
  imports: [
    BrowserModule,
    WebPluginModule,
    BrowserAnimationsModule
  ],
  entryComponents: [WebPluginComponent],
  bootstrap: []
})
export class AppModule {
  constructor(private injector: Injector) {}

  ngDoBootstrap() {
    const ngElement = createCustomElement(WebPluginComponent, {
      injector: this.injector
    });
    customElements.define('tesla-web-plugin', ngElement);
  }
}
