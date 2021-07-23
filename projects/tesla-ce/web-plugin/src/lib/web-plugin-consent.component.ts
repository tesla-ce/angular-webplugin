import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { WebPluginStatusService } from './web-plugin-status.service';
import { TranslateService } from '@ngx-translate/core';
import {IconLoader, WebPluginService} from './web-plugin.service';

/** @dynamic */
@Component({
  selector: 'lib-tesla-consent',
  templateUrl: './web-plugin-consent.component.html',
  styleUrls: [
    './web-plugin-consent.component.scss'
  ]
})
export class WebPluginConsentComponent extends IconLoader implements OnInit, OnDestroy {

  constructor(private dialogRef: MatDialogRef<WebPluginConsentComponent>, public translate: TranslateService,
              private pluginService: WebPluginService, private statusService: WebPluginStatusService) {
    super(pluginService.getAssetsBaserUrl());
  }
  public enabledInstruments = [];
  public allowRejectCapture = false;
  public breakpoint = null;

  static getBreakPoint(innerWidth) {
    if (innerWidth < 500) {
      return 1;
    }

    if (innerWidth < 720) {
      return 2;
    }

    if (innerWidth < 1200) {
      return 3;
    }

    return 5;

  }

  public ngOnInit(): void {
    this.breakpoint = WebPluginConsentComponent.getBreakPoint(window.innerWidth);

    this.pluginService.configChange.subscribe(value => {
      this.enabledInstruments = this.pluginService.getInstruments();
      if (this.pluginService.getActivity() !== null) {
        this.allowRejectCapture = this.pluginService.getActivity().allow_reject_capture;
      }
    });
  }

  onResize(event) {
    this.breakpoint = WebPluginConsentComponent.getBreakPoint(event.target.innerWidth);
  }

  public ngOnDestroy(): void {

  }

  public accept(): void {
    this.dialogRef.close('accepted');
    this.statusService.addNotification('INFO', 'NOTIFICATION.CONSENT.ACCEPTED');
  }

  public reject(): void {
    this.dialogRef.close('rejected');
    this.statusService.addNotification('INFO', 'NOTIFICATION.CONSENT.REJECTED');
  }

  public cancel(): void {
    this.dialogRef.close('cancel');
  }
}
