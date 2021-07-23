import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { WebPluginStatusService, Notification } from './web-plugin-status.service';
import { Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import {IconLoader, WebPluginService} from './web-plugin.service';

/** @dynamic */
@Component({
  selector: 'lib-tesla-notifications',
  templateUrl: './web-plugin-notifications.component.html',
  styleUrls: [
    './web-plugin-notifications.component.scss'
  ]
})
export class WebPluginNotificationsComponent extends IconLoader implements OnInit, OnDestroy {

  public notifications: Observable<Array<Notification>>;

  constructor(@Inject(WebPluginService) private config: WebPluginService,
              @Inject(WebPluginStatusService) private status: WebPluginStatusService,
              private dialogRef: MatDialogRef<WebPluginNotificationsComponent>,
              public translate: TranslateService
              ) {
    super(config.getAssetsBaserUrl());
  }

  public ngOnInit(): void {
    this.notifications = this.status.systemNotifications;
  }

  public ngOnDestroy(): void {

  }

  public close(): void {
    this.dialogRef.close();
  }

  public clearNotifications(): void {
    this.status.clearNotifications();
    this.dialogRef.close();
  }
}
