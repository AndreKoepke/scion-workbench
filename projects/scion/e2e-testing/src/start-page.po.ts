/*
 * Copyright (c) 2018-2022 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms from the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {AppPO} from './app.po';
import {ViewPO} from './view.po';
import {Locator} from '@playwright/test';
import {SciTabbarPO} from './@scion/components.internal/tabbar.po';

/**
 * Page object to interact {@link StartPageComponent}.
 */
export class StartPagePO {

  private readonly _locator: Locator;
  private readonly _tabbarLocator: Locator;
  private readonly _tabbarPO: SciTabbarPO;

  public readonly view?: ViewPO;

  constructor(private _appPO: AppPO, public viewId?: string | undefined) {
    if (viewId) {
      this.view = _appPO.view({viewId});
      this._locator = this.view.locator('app-start-page');
    }
    else {
      this._locator = _appPO.activePart.locator('app-start-page');
    }
    this._tabbarLocator = this._locator.locator('sci-tabbar');
    this._tabbarPO = new SciTabbarPO(this._tabbarLocator);
  }

  /**
   * Clicks the workbench view tile with specified CSS class set.
   */
  public async openWorkbenchView(viewCssClass: string): Promise<void> {
    await this._tabbarPO.selectTab('e2e-workbench-views');
    await this._tabbarLocator.locator(`.e2e-workbench-view-tiles a.${viewCssClass}`).click();
    await this._appPO.view({cssClass: viewCssClass}).waitUntilPresent();
  }

  /**
   * Clicks the microfrontend view tile with specified CSS class set.
   */
  public async openMicrofrontendView(viewCssClass: string, app: string): Promise<void> {
    await this._tabbarPO.selectTab('e2e-microfrontend-views');
    await this._tabbarLocator.locator(`.e2e-microfrontend-view-tiles a.${viewCssClass}.workbench-client-testing-${app}`).click();
    await this._appPO.view({cssClass: viewCssClass}).waitUntilPresent();
  }

  /**
   * Clicks the test capability tile with specified CSS class set.
   */
  public async clickTestCapability(capabilityCssClass: string, app: string): Promise<void> {
    await this._tabbarPO.selectTab('e2e-test-capabilities');
    await this._tabbarLocator.locator(`.e2e-test-capability-tiles a.${capabilityCssClass}.workbench-client-testing-${app}`).click();
  }

  public async isPresent(): Promise<boolean> {
    return this._locator.isVisible();
  }
}
