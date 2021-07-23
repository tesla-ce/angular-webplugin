import {APP_INITIALIZER, NgModule} from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { WebPluginComponent } from './web-plugin.component';
import { WebPluginMenuComponent } from './web-plugin-menu.component';
import { WebPluginConsentComponent } from './web-plugin-consent.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { HttpClient, HttpClientModule} from '@angular/common/http';
import { TranslateLoader, TranslateModule} from '@ngx-translate/core';
import { TranslateHttpLoader} from '@ngx-translate/http-loader';
import { BrowserModule } from '@angular/platform-browser';
import { WebPluginService } from './web-plugin.service';
import { WebPluginNotificationsComponent } from './web-plugin-notifications.component';
import { MomentModule } from 'ngx-moment';
import { WebPluginConnectionService} from './web-plugin-connection.service';
import { StorageModule} from '@ngx-pwa/local-storage';
import { WebPluginStatusService } from './web-plugin-status.service';
import { WebPluginTokenService } from './web-plugin-token.service';
import {AngularSvgIconModule} from 'angular-svg-icon';

import { SensorsModule } from '@tesla-ce/sensors';
import { MatGridListModule} from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { TeslaIconsModule} from '@tesla-ce/icons';
// import { TeslaIconsModule } from '../../../icons/src/lib/tesla.icons.module';

// AoT requires an exported function for factories
export function HttpLoaderFactory(httpClient: HttpClient, webPluginService: WebPluginService) {

  return new TranslateHttpLoader(httpClient, webPluginService.getAssetsBaserUrl() + 'i18n/');
}

export function appInit(pluginService: WebPluginService) {
  const conf = () => pluginService.load().toPromise();
  return conf;
}

export function appBaseHRef(pluginService: WebPluginService) {
  const baseUrl = pluginService.getBaserUrl();
  console.log('Base URL set to: ' + baseUrl);
  return baseUrl;
}

@NgModule({
  declarations: [
    WebPluginComponent,
    WebPluginMenuComponent,
    WebPluginConsentComponent,
    WebPluginNotificationsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MomentModule,
    StorageModule,
    AngularSvgIconModule.forRoot(),
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient, WebPluginService]
            }
    }),
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatListModule,
    MatBadgeModule,
    MatGridListModule,
    MatCardModule,
    SensorsModule,
    TeslaIconsModule.forRoot({
      provide: APP_BASE_HREF,
      useFactory: appBaseHRef,
      deps: [WebPluginService]
    })
  ],
  exports: [WebPluginComponent],
  providers: [
    WebPluginService,
    WebPluginConnectionService,
    WebPluginStatusService,
    WebPluginTokenService,
    {
      provide: MatDialogRef,
      useValue: {}
    },
    {
      provide: APP_INITIALIZER,
      useFactory: appInit,
      multi: true,
      deps: [WebPluginService]
    },
    {
      provide: APP_BASE_HREF,
      useFactory: appBaseHRef,
      deps: [WebPluginService]
    },
  ],
  bootstrap: []
})
export class WebPluginModule { }
