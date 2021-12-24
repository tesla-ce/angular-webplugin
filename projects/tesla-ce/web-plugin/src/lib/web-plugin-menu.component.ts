import { Component, Inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import {APP_BASE_HREF, DOCUMENT} from '@angular/common';
import {Observable, fromEvent, Subscription} from 'rxjs';
import {IconLoader, WebPluginService} from './web-plugin.service';
import { WebPluginStatusService, SensorsStatus, NetworkStatus, ConsentStatus, Notification } from './web-plugin-status.service';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { WebPluginNotificationsComponent } from './web-plugin-notifications.component';
import { TranslateService } from '@ngx-translate/core';
import {MatDialogRef} from "@angular/material/dialog/dialog-ref";

/** @dynamic */
@Component({
  selector: 'lib-tesla-menu',
  templateUrl: './web-plugin-menu.component.html',
  styleUrls: [
    './web-plugin-menu.component.scss'
  ]
})
export class WebPluginMenuComponent extends IconLoader implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('menuOverlay') menuOverlay: ElementRef = {} as ElementRef;
  @ViewChild('floatingMenu') floatingMenu: ElementRef = {} as ElementRef;
  @ViewChild('menuToggle', {static: true}) menuToggle: ElementRef<HTMLCanvasElement> = {} as ElementRef<HTMLCanvasElement>;
  @ViewChild('mainMenu') mainMenu: ElementRef = {} as ElementRef;
  public numAlerts: number = 0;
  private expanded = false;
  private dragged = false;
  private context: CanvasRenderingContext2D = {} as CanvasRenderingContext2D;
  private pos1 = 0;
  private pos2 = 0;
  private pos3 = 0;
  private pos4 = 0;
  private mouseDown: Subscription = {} as Subscription;
  private mouseUp: Subscription = {} as Subscription;
  private mouseMove: Subscription = {} as Subscription;
  public network: Observable<NetworkStatus> = {} as Observable<NetworkStatus>;
  public sensors: Observable<SensorsStatus> = {} as Observable<SensorsStatus>;
  public consent: Observable<ConsentStatus> = {} as Observable<ConsentStatus>;
  public notifications: Observable<Array<Notification>> = {} as Observable<Array<Notification>>;
  private notificationsDialogRef:MatDialogRef<WebPluginNotificationsComponent> = {} as MatDialogRef<WebPluginNotificationsComponent>;
  public dashboardUrl = '#';
  public logoNotification = false;
  public floatingX = 0;
  public floatingY = 0;

  constructor(@Inject(DOCUMENT) private document: Document,
              @Inject(WebPluginService) private config: WebPluginService,
              @Inject(WebPluginStatusService) private status: WebPluginStatusService,
              private dialog: MatDialog, public translate: TranslateService,
              @Inject(APP_BASE_HREF) private appBaseHref: string) {
    super(config.getAssetsBaserUrl());
  }

  public ngOnInit(): void {
    this.notifications = this.status.systemNotifications;
    this.network = this.status.networkStatus;
    this.sensors = this.status.sensorsStatus;
    this.consent = this.status.consentStatus;
    this.dashboardUrl = this.config.getDashboardUrl();

    this.notifications.subscribe((notifications:any) => {
      if (notifications.length > 0) {
        this.logoNotification = true;
      }
    });
  }

  public ngAfterViewInit(): void {
    const instance = this;

    this.context = this.menuToggle.nativeElement.getContext('2d')!;
    this.mouseDown = fromEvent(this.floatingMenu.nativeElement, 'mousedown').subscribe(event => {
      instance.dragMouseDown(event as MouseEvent);
    });

    this.drawImage();
  }

  public ngOnDestroy(): void {
    this.mouseDown.unsubscribe();
    this.mouseUp.unsubscribe();
    this.mouseMove.unsubscribe();
  }

  public toggle(): void {
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    if (this.expanded) {
      this.menuOverlay.nativeElement.style.display = 'none';
      this.mainMenu.nativeElement.style.transform = 'scale(0)';
      this.menuToggle.nativeElement.style.transform = 'scale(1)';
    } else {
      this.menuOverlay.nativeElement.style.display = 'block';
      this.mainMenu.nativeElement.style.transform = 'scale(3)';
      this.menuToggle.nativeElement.style.transform = 'scale(0.5)';
      this.logoNotification = false;
    }
    this.expanded = !this.expanded;
  }

  private drawImage(): void {
    const logoImg = new Image();
    logoImg.onload = () => {
      switch (this.config.getFloatingMenuPosition()) {
        default:
        case 'top-right':
          this.floatingX = window.innerWidth - 120;
          this.floatingY = 0;
          break;
        case 'top-left':
          this.floatingX = 0;
          this.floatingY = 0;
          break;
        case 'top-middle':
          this.floatingX = window.innerWidth / 2 - 60;
          this.floatingY = 0;
          break;
        case 'bottom-right':
          this.floatingX = window.innerWidth - 120;
          this.floatingY = window.innerHeight - 140;
          break;
        case 'bottom-left':
          this.floatingX = 0;
          this.floatingY = window.innerHeight - 140;
          break;
        case 'bottom-middle':
          this.floatingX = window.innerWidth / 2 - 60;
          this.floatingY = window.innerHeight - 140;
          break;
      }

      this.context.drawImage(logoImg, 5, 5,
        this.floatingMenu.nativeElement.clientWidth - 10,
        this.floatingMenu.nativeElement.clientHeight - 10);
      /* if(_first_start) {
          updateMenuStatus(_core_module.getAlerts());
          _first_start = false;
      } */
    };
    logoImg.src = 'assets/icons/common/menu_logo.svg';
    if (this.appBaseHref !== '') {
      logoImg.src = this.appBaseHref + 'assets/icons/common/menu_logo.svg';
    }

    this.context.shadowColor = '#aeaeb3';
    this.context.shadowOffsetX = 4;
    this.context.shadowOffsetY = 2;
    this.context.shadowBlur = 2;
  }

  public dragMouseDown(event: MouseEvent) {
    this.pos3 = event.clientX;
    this.pos4 = event.clientY;
    this.mouseMove = fromEvent(this.document, 'mousemove').subscribe(event2 => {

      event2.preventDefault();
      const ev2 = event2 as MouseEvent;

      const w = Math.round(this.floatingMenu.nativeElement.clientWidth / 2.0);
      const h = Math.round(this.floatingMenu.nativeElement.clientHeight / 2.0);
      const x = Math.max(w, Math.min(document.documentElement.clientWidth - w, ev2.clientX));
      const y = Math.max(h, Math.min(document.documentElement.clientHeight - h, ev2.clientY));
      this.pos1 = this.pos3 - x;
      this.pos2 = this.pos4 - y;
      this.pos3 = x;
      this.pos4 = y;
      // set the element's new position:
      this.floatingMenu.nativeElement.style.top = (this.floatingMenu.nativeElement.offsetTop - this.pos2) + 'px';
      this.floatingMenu.nativeElement.style.left = (this.floatingMenu.nativeElement.offsetLeft - this.pos1) + 'px';
      this.dragged = true;
    });
    this.mouseUp = fromEvent(this.document, 'mouseup').subscribe(event3 => {
      event3.preventDefault();
      this.mouseUp.unsubscribe();
      this.mouseMove.unsubscribe();
    });
  }

  public showAlerts() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = false;
    dialogConfig.autoFocus = true;
    dialogConfig.closeOnNavigation = false;
    dialogConfig.id = 'TeSLAAlertsDialog';

    this.toggle();
    this.notificationsDialogRef = this.dialog.open(WebPluginNotificationsComponent, dialogConfig);
  }
}
