/*
 * Copyright (c) 2018-2019 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */

import { Injectable } from '@angular/core';
import { ACTIVITY_OUTLET_NAME, VIEW_GRID_QUERY_PARAM, VIEW_REF_PREFIX } from '../workbench.constants';
import { ActivatedRoute, NavigationExtras, PRIMARY_OUTLET, Router, UrlSegment } from '@angular/router';
import { InternalWorkbenchService } from '../workbench.service';
import { WorkbenchViewRegistry } from '../workbench-view-registry.service';
import { Defined } from '../defined.util';
import { WorkbenchViewPartRegistry } from '../view-part-grid/workbench-view-part-registry.service';
import { Arrays } from '../array.util';

/**
 * Provides workbench view navigation capabilities based on Angular Router.
 */
export abstract class WorkbenchRouter {

  /**
   * Navigates based on the provided array of commands, and is like 'Router.navigate(...)' but with a workbench view as the router outlet target.
   *
   * By default, navigation is absolute. Make it relative by providing a `relativeTo` route in navigational extras.
   * Navigation allows to close present views matching the routing commands if `closeIfPresent` is set in navigational extras.
   *
   * - Target view can be set via {WbNavigationExtras} object.
   * - Multiple static segments can be merged into one, e.g. `['/team/11/user', userName, {details: true}]`
   * - The first segment name can be prepended with `/`, `./`, or `../`
   * - Matrix parameters can be used to associate optional data with the URL, e.g. `['user', userName, {details: true}]`
   *   Matrix parameters are like regular URL parameters, but do not affect route resolution. Unlike query parameters, matrix parameters
   *   are not global but part of the routing path, which makes them suitable for auxiliary routes.
   *
   * ### Usage
   *
   * ```
   * router.navigate(['team', 33, 'user', 11]);
   * router.navigate(['team/11/user', userName, {details: true}]); // multiple static segments can be merged into one
   * router.navigate(['teams', {selection: 33'}]); // matrix parameter 'selection' with the value '33'.
   * ```
   *
   * @see WbRouterLinkDirective
   */
  public abstract navigate(commands: any[], extras?: WbNavigationExtras): Promise<boolean>;
}

@Injectable()
export class InternalWorkbenchRouter implements WorkbenchRouter {

  constructor(private _router: Router,
              private _workbench: InternalWorkbenchService,
              private _viewRegistry: WorkbenchViewRegistry,
              private _viewPartRegistry: WorkbenchViewPartRegistry) {
  }

  public navigate(commandList: any[], extras: WbNavigationExtras = {}): Promise<boolean> {
    const commands = this.normalizeCommands(commandList, extras.relativeTo);

    if (extras.closeIfPresent) {
      return this._workbench.destroyView(...this.resolvePresentViewRefs(commands));
    }

    const activateIfPresent = Defined.orElse(extras.activateIfPresent, !commands.includes('new') && !commands.includes('create') /* coerce activation based on command segment names */);
    // If the view is present, activate it.
    if (activateIfPresent) {
      const presentViewRef = this.resolvePresentViewRefs(commands)[0];
      if (presentViewRef) {
        return this._workbench.activateView(presentViewRef);
      }
    }

    const routeFn = (outlet: string, serializedGrid: string): Promise<boolean> => {
      return this._router.navigate([{outlets: {[outlet]: commands}}], {
        ...extras as NavigationExtras,
        relativeTo: null, // commands are absolute because normalized
        queryParams: {...extras.queryParams, [VIEW_GRID_QUERY_PARAM]: serializedGrid},
        queryParamsHandling: 'merge',
      });
    };

    switch (extras.target || 'blank') {
      case 'blank': {
        const viewPartGrid = this._viewPartRegistry.grid;
        const newViewRef = this._viewRegistry.computeNextViewOutletIdentity();
        const viewPartRef = extras.blankViewPartRef || (this._workbench.activeViewPartService && this._workbench.activeViewPartService.viewPartRef) || viewPartGrid.viewPartRefs()[0];
        return routeFn(newViewRef, viewPartGrid.addView(viewPartRef, newViewRef).serialize());
      }
      case 'self': {
        if (!extras.selfViewRef) {
          throw Error('Invalid argument: navigation property \'selfViewRef\' required for routing view target \'self\'.');
        }

        const urlTree = this._router.parseUrl(this._router.url);
        const urlSegmentGroups = urlTree.root.children;
        if (!urlSegmentGroups[extras.selfViewRef]) {
          throw Error(`Invalid argument: '${extras.selfViewRef}' is not a valid view outlet.`);
        }

        return routeFn(extras.selfViewRef, this._viewPartRegistry.grid.serialize());
      }
      default: {
        throw Error('Not supported routing view target.');
      }
    }
  }

  /**
   * Resolves present views which match the given commands.
   */
  public resolvePresentViewRefs(commands: any[]): string[] {
    const serializeCommands = this.serializeCommands(commands);
    const urlTree = this._router.parseUrl(this._router.url);
    const urlSegmentGroups = urlTree.root.children;

    return Object.keys(urlSegmentGroups)
      .filter(outletName => outletName.startsWith(VIEW_REF_PREFIX))
      .filter(outletName => Arrays.equal(serializeCommands, urlSegmentGroups[outletName].segments.map((segment: UrlSegment) => segment.toString())));
  }

  /**
   * Normalizes commands to their absolute form.
   *
   * ---
   * As of Angular 6.x, commands which target a named outlet (auxiliary route) are not normalized, meaning that
   * relative navigational symbols like `/`, `./`, or `../` are not resolved (see `create_url_tree.ts` method: `computeNavigation`).
   *
   * Example: router.navigate([{outlets: {[outlet]: commands}}])
   *
   * To bypass that restriction, we first create an URL tree without specifying the target outlet. As expected, this translates into an
   * URL with all navigational symbols resolved. Then, we extract the URL segments of the resolved route and convert it back into commands.
   * The resulting commands are in their absolute form and may be used for the effective navigation to target a named router outlet.
   */
  public normalizeCommands(commands: any[], relativeTo?: ActivatedRoute | null): any[] {
    const normalizeFn = (outlet: string, extras?: NavigationExtras): any[] => {
      return this._router.createUrlTree(commands, extras)
        .root.children[outlet].segments
        .reduce((acc, p) => [...acc, p.path, ...(Object.keys(p.parameters).length ? [p.parameters] : [])], []);
    };

    if (!relativeTo) {
      return normalizeFn(PRIMARY_OUTLET);
    }

    const targetOutlet = relativeTo.pathFromRoot[1] && relativeTo.pathFromRoot[1].outlet;
    if (!targetOutlet || (!targetOutlet.startsWith(VIEW_REF_PREFIX) && !targetOutlet.startsWith(ACTIVITY_OUTLET_NAME))) {
      return normalizeFn(PRIMARY_OUTLET);
    }

    return normalizeFn(targetOutlet, {relativeTo});
  }

  /**
   * Serializes given commands into valid URL segments.
   */
  private serializeCommands(commands: any[]): string[] {
    const serializedCommands: string[] = [];

    commands.forEach(cmd => {
      // if matrix param, append it to the last segment
      if (typeof cmd === 'object') {
        serializedCommands.push(new UrlSegment(serializedCommands.pop(), cmd).toString());
      }
      else {
        serializedCommands.push(encodeURIComponent(cmd));
      }
    });

    return serializedCommands;
  }
}

/**
 * Represents the extra options used during navigation.
 */
export interface WbNavigationExtras extends NavigationExtras {
  /**
   * Activates the view if it is already present.
   * If not present, the view is opened according to the specified 'target' strategy.
   */
  activateIfPresent?: boolean;
  /**
   * Closes the view if present. Has no effect if no view is present which matches the qualifier.
   */
  closeIfPresent?: boolean;
  /**
   * Controls where to open the view.
   *
   * 'blank': opens the view as a new workbench view (which is by default)
   * 'self':  opens the view in the current workbench view
   */
  target?: 'blank' | 'self';
  /**
   * Specifies the view which to replace when using 'self' view target strategy.
   * If not specified and if in the context of a workbench view, that view is used as the self target.
   */
  selfViewRef?: string;
  /**
   * Specifies the viewpart where to attach the new view when using 'blank' view target strategy.
   * If not specified, the active workbench viewpart is used as the 'blank' target.
   */
  blankViewPartRef?: string;
}
