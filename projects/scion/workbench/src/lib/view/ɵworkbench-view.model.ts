/*
 * Copyright (c) 2018-2022 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {ViewActivationInstantProvider} from './view-activation-instant-provider.service';
import {ChildrenOutletContexts, Router, UrlSegment} from '@angular/router';
import {ViewDragService} from '../view-dnd/view-drag.service';
import {WorkbenchViewPartRegistry} from '../view-part/workbench-view-part.registry';
import {WorkbenchLayoutService} from '../layout/workbench-layout.service';
import {map} from 'rxjs/operators';
import {filterArray, mapArray} from '@scion/toolkit/operators';
import {Arrays} from '@scion/toolkit/util';
import {Disposable} from '../disposable';
import {WorkbenchMenuItem, WorkbenchMenuItemFactoryFn} from '../workbench.model';
import {WorkbenchView} from './workbench-view.model';
import {WorkbenchViewPart} from '../view-part/workbench-view-part.model';
import {ɵWorkbenchService} from '../ɵworkbench.service';
import {ComponentType} from '@angular/cdk/portal';
import {WbComponentPortal} from '../portal/wb-component-portal';
import {ROUTER_OUTLET_NAME} from '../workbench.constants';
import {inject} from '@angular/core';

export class ɵWorkbenchView implements WorkbenchView {

  private readonly _menuItemProviders$ = new BehaviorSubject<WorkbenchMenuItemFactoryFn[]>([]);

  public title: string | null = null;
  public heading: string | null = null;
  public dirty: boolean;
  public closable: boolean;

  public scrollTop = 0;
  public scrollLeft = 0;
  public activationInstant!: number;

  public readonly active$: BehaviorSubject<boolean>;
  public readonly cssClasses$: BehaviorSubject<string[]>;
  public readonly menuItems$: Observable<WorkbenchMenuItem[]>;
  public readonly blocked$ = new BehaviorSubject(false);
  public readonly portal: WbComponentPortal<any>;

  constructor(public readonly viewId: string,
              viewComponent: ComponentType<any>, // do not reference `ViewComponent` to avoid import cycles
              private _workbench: ɵWorkbenchService = inject(ɵWorkbenchService),
              private _workbenchLayoutService: WorkbenchLayoutService = inject(WorkbenchLayoutService),
              private _viewPartRegistry: WorkbenchViewPartRegistry = inject(WorkbenchViewPartRegistry),
              private _viewDragService: ViewDragService = inject(ViewDragService),
              private _router: Router = inject(Router),
              private _viewActivationInstantProvider: ViewActivationInstantProvider = inject(ViewActivationInstantProvider)) {
    this.active$ = new BehaviorSubject<boolean>(false);
    this.cssClasses$ = new BehaviorSubject<string[]>([]);
    this.dirty = false;
    this.closable = true;

    this.menuItems$ = combineLatest([this._menuItemProviders$, this._workbench.viewMenuItemProviders$])
      .pipe(
        map(([localMenuItemProviders, globalMenuItemProviders]) => localMenuItemProviders.concat(globalMenuItemProviders)),
        mapArray<WorkbenchMenuItemFactoryFn, WorkbenchMenuItem>(menuItemFactoryFn => menuItemFactoryFn(this)),
        filterArray<WorkbenchMenuItem>(Boolean),
      );

    this.portal = this.createPortal(viewComponent);
  }

  private createPortal(viewComponent: ComponentType<any>): WbComponentPortal<any> {
    return new WbComponentPortal(viewComponent, {
      providers: [
        {provide: ROUTER_OUTLET_NAME, useValue: this.viewId},
        {provide: ɵWorkbenchView, useValue: this},
        {provide: WorkbenchView, useExisting: ɵWorkbenchView},
        // Provide the root parent outlet context, crucial if the outlet is not instantiated at the time the route gets activated (e.g., if inside a `ngIf`, as it is in {ViewComponent}).
        // Otherwise, the outlet would not render the activated route.
        {provide: ChildrenOutletContexts, useValue: inject(ChildrenOutletContexts)},
      ],
    });
  }

  public get first(): boolean {
    return this.position === 0;
  }

  public get last(): boolean {
    return this.position === this.part.viewIds.length - 1;
  }

  public get position(): number {
    return this.part.viewIds.indexOf(this.viewId);
  }

  public set cssClass(cssClass: string | string[]) {
    this.cssClasses$.next(Arrays.coerce(cssClass));
  }

  public get cssClasses(): string[] {
    return this.cssClasses$.value;
  }

  public get active(): boolean {
    return this.active$.getValue();
  }

  public activate(activate: boolean): void {
    if (activate === this.active) {
      return;
    }
    if (activate) {
      this.activationInstant = this._viewActivationInstantProvider.instant;
    }
    this.active$.next(activate);
  }

  public get part(): WorkbenchViewPart {
    // DO NOT resolve the part at construction time because it can change, e.g. when this view is moved to another part.
    const part = this._workbenchLayoutService.layout!.findPartByViewId(this.viewId, {orElseThrow: true});
    return this._viewPartRegistry.getElseThrow(part.partId);
  }

  public close(target?: 'self' | 'all-views' | 'other-views' | 'views-to-the-right' | 'views-to-the-left'): Promise<boolean> {
    switch (target || 'self') {
      case 'self': {
        return this._workbench.destroyView(this.viewId);
      }
      case 'all-views': {
        return this._workbench.destroyView(...this.part.viewIds);
      }
      case 'other-views': {
        return this._workbench.destroyView(...this.part.viewIds.filter(viewId => viewId !== this.viewId));
      }
      case 'views-to-the-right': {
        const viewIds = this.part.viewIds;
        return this._workbench.destroyView(...viewIds.slice(viewIds.indexOf(this.viewId) + 1));
      }
      case 'views-to-the-left': {
        const viewIds = this.part.viewIds;
        return this._workbench.destroyView(...viewIds.slice(0, viewIds.indexOf(this.viewId)));
      }
      default: {
        return Promise.resolve(false);
      }
    }
  }

  public move(region: 'north' | 'south' | 'west' | 'east' | 'blank-window'): Promise<boolean> {
    this._viewDragService.dispatchViewMoveEvent({
      source: {
        appInstanceId: this._workbench.appInstanceId,
        partId: this.part.partId,
        viewId: this.viewId,
        viewUrlSegments: this.urlSegments,
      },
      target: {
        appInstanceId: region === 'blank-window' ? 'new' : this._workbench.appInstanceId,
        partId: region === 'blank-window' ? null : this.part.partId,
        region: region === 'blank-window' ? 'center' : region,
      },
    });
    return Promise.resolve(true);
  }

  public get urlSegments(): UrlSegment[] {
    const urlTree = this._router.parseUrl(this._router.url);
    const urlSegmentGroups = urlTree.root.children;

    const viewOutlet = urlSegmentGroups[this.viewId];
    if (!viewOutlet) {
      throw Error(`[NullOutletError] View outlet not part of the URL [outlet=${this.viewId}]`);
    }

    return viewOutlet.segments;
  }

  public registerMenuItem(menuItem: WorkbenchMenuItem): Disposable {
    const factoryFn = (): WorkbenchMenuItem => menuItem;
    this._menuItemProviders$.next(this._menuItemProviders$.value.concat(factoryFn));
    return {
      dispose: (): void => {
        this._menuItemProviders$.next(this._menuItemProviders$.value.filter(it => it !== factoryFn));
      },
    };
  }

  public get blocked(): boolean {
    return this.blocked$.value;
  }

  public set blocked(blocked: boolean) {
    this.blocked$.next(blocked);
  }

  public get destroyed(): boolean {
    return this.portal.isDestroyed;
  }

  public destroy(): void {
    this.portal.destroy();
  }
}
