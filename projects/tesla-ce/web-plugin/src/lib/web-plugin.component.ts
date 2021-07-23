import { Component, Inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { WebPluginConsentComponent } from './web-plugin-consent.component';
import { WebPluginService} from './web-plugin.service';
import { WebPluginStatusService, SensorsStatus, NetworkStatus} from './web-plugin-status.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import {Observable, timer} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import * as moment from 'moment';
import {WebPluginConnectionService} from './web-plugin-connection.service';
import {APP_BASE_HREF} from '@angular/common';


/** @dynamic */
@Component({
  selector: 'lib-web-plugin',
  templateUrl: './web-plugin.component.html',
  styleUrls: [
    './web-plugin.component.scss'
  ],
})
export class WebPluginComponent implements OnInit, AfterViewInit, OnDestroy {
  public network: Observable<NetworkStatus>;
  public sensors: Observable<SensorsStatus>;
  @ViewChild('pluginMenuComponent') pluginMenu: ElementRef;
  private consentDialogRef = null;

  everySecond: Observable<number> = timer(0, 15000);
  subscription = null;

  constructor(@Inject(WebPluginService) private config: WebPluginService,
              @Inject(APP_BASE_HREF) private appBaseHref: string,
              @Inject(WebPluginStatusService) private status: WebPluginStatusService,
              @Inject(WebPluginConnectionService) private connection: WebPluginConnectionService,
              private dialog: MatDialog, public translate: TranslateService) {
                  translate.addLangs(['en', 'ca', 'bg', 'es', 'fi', 'tr']);
                  translate.setDefaultLang('en');

                  if (config.getLocale() !== null) {
                    // Use configured locale
                    translate.use(config.getLocale());
                    moment.locale(config.getLocale());
                  } else if (config.getLearner() !== null &&
                    config.getLearner().hasOwnProperty('locale') && config.getLearner().locale !== null) {
                    // Use learner default language
                    translate.use(config.getLearner().locale);
                    moment.locale(config.getLearner().locale);
                  } else {
                    const browserLang = translate.getBrowserLang();
                    const lang = browserLang.match(/en|ca|bg|es|fi|tr/) ? browserLang : 'en';
                    translate.use(lang);
                    moment.locale(lang);
                  }
  }

  public ngOnInit(): void {
    this.network = this.status.networkStatus;
    this.sensors = this.status.sensorsStatus;
  }

  public ngAfterViewInit(): void {
    this.status.consentStatus.subscribe( value => {
      if (this.status.isReady()) {
        if (!this.status.getConsentStatus().accepted && !this.status.getConsentStatus().rejected) {
          this.showConsentDialog();
        } else if (this.consentDialogRef !== null) {
          this.consentDialogRef.close();
        }
        if (this.status.getConsentStatus().accepted) {
          this.config.startDataCapture();
        }
      }
    });
  }

  public ngOnDestroy(): void {
    this.config.stopDataCapture();
  }

  public showConsentDialog(): void {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;
    dialogConfig.id = 'TeSLAConsentDialog';

    this.consentDialogRef = this.dialog.open(WebPluginConsentComponent, dialogConfig);
    this.consentDialogRef.afterClosed().subscribe(
        data => {
          this.consentDialogRef = null;
          if (data === 'accepted') {
            this.status.acceptConsent();
          } else if (data === 'rejected') {
            this.status.rejectConsent();
          } else {
            this.showConsentDialog();
          }
        }
    );
    this.consentDialogRef.afterOpened().subscribe( () => {
      const div = document.getElementsByTagName('body')[0];
      const config = { attributes: true, childList: true, subtree: true };
      const observer = new MutationObserver((mutationsList) => {
        if (document.getElementById('TeSLAConsentDialog') == null) {
            for (const mutation of mutationsList) {
                if (mutation.removedNodes.length > 0) {
                    mutation.removedNodes.forEach(node => {
                        if (node.parentNode !== null && node.parentNode.querySelector('#TeSLAConsentDialog') !== null) {
                            document.body.appendChild(node);
                            this.connection.sendAlertMessage(
                              'alert',
                              'ALERT.DOM_CHANGE.REMOVED_NODE',
                              JSON.stringify({
                                type: 'DOM_CHANGE',
                                message: 'Detected manual removal of EthicalWarning'
                              }));
                            this.status.addNotification('alert', 'ALERT.DOM_CHANGE.REMOVED_NODE');
                        }
                    });
                }
            }
        } else {
            for (const mutation of mutationsList) {
                if (mutation.attributeName === 'style' && mutation.target.nodeName === 'TeSLAConsentDialog' ){
                    if (this.consentDialogRef.style.display !== 'flex') {
                        this.consentDialogRef.style.display = 'flex';
                        this.connection.sendAlertMessage(
                          'alert',
                          'ALERT.DOM_CHANGE.CHANGED_STYLE',
                          JSON.stringify({
                            type: 'DOM_CHANGE',
                            message: 'Detected manual style change of EthicalWarning'
                          }));
                        this.status.addNotification('alert', 'ALERT.DOM_CHANGE.CHANGED_STYLE');
                    }
                }
            }
        }
      });
      observer.observe(div, config);
    });
  }
}
