/*
 * Copyright (c) 2018-2022 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms from the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {fromRect, withoutUndefinedEntries} from '../../helper/testing.util';
import {AppPO} from '../../app.po';
import {PopupPO} from '../../popup.po';
import {PopupSize} from '@scion/workbench';
import {Params} from '@angular/router';
import {WorkbenchPopupCapability, WorkbenchPopupReferrer} from '@scion/workbench-client';
import {SciAccordionPO} from '../../@scion/components.internal/accordion.po';
import {SciPropertyPO} from '../../@scion/components.internal/property.po';
import {ElementSelectors} from '../../helper/element-selectors';
import {Locator} from '@playwright/test';

/**
 * Page object to interact {@link PopupPageComponent}.
 */
export class PopupPagePO {

  private readonly _locator: Locator;
  private readonly _hasFocusLocator: Locator;

  public readonly popupPO: PopupPO;

  constructor(appPO: AppPO, cssClass: string) {
    this.popupPO = appPO.popup({cssClass});

    const frameLocator = appPO.page.frameLocator(ElementSelectors.routerOutletFrame({cssClass: ['e2e-popup'].concat(cssClass)}));
    this._locator = frameLocator.locator('app-popup-page');
    this._hasFocusLocator = frameLocator.locator('app-root').locator('.e2e-has-focus');
  }

  public async getComponentInstanceId(): Promise<string> {
    return this._locator.locator('span.e2e-component-instance-id').innerText();
  }

  public async getPopupCapability(): Promise<WorkbenchPopupCapability> {
    const accordionPO = new SciAccordionPO(this._locator.locator('sci-accordion.e2e-popup-capability'));
    await accordionPO.expand();
    try {
      return JSON.parse(await accordionPO.itemLocator().locator('div.e2e-popup-capability').innerText());
    }
    finally {
      await accordionPO.collapse();
    }
  }

  public async getPopupParams(): Promise<Params> {
    const accordionPO = new SciAccordionPO(this._locator.locator('sci-accordion.e2e-popup-params'));
    await accordionPO.expand();
    try {
      return await new SciPropertyPO(accordionPO.itemLocator().locator('sci-property.e2e-popup-params')).readProperties();
    }
    finally {
      await accordionPO.collapse();
    }
  }

  public async getRouteParams(): Promise<Params> {
    const accordionPO = new SciAccordionPO(this._locator.locator('sci-accordion.e2e-route-params'));
    await accordionPO.expand();
    try {
      return await new SciPropertyPO(accordionPO.itemLocator().locator('sci-property.e2e-route-params')).readProperties();
    }
    finally {
      await accordionPO.collapse();
    }
  }

  public async getRouteQueryParams(): Promise<Params> {
    const accordionPO = new SciAccordionPO(this._locator.locator('sci-accordion.e2e-route-query-params'));
    await accordionPO.expand();
    try {
      return await new SciPropertyPO(accordionPO.itemLocator().locator('sci-property.e2e-route-query-params')).readProperties();
    }
    finally {
      await accordionPO.collapse();
    }
  }

  public async getRouteFragment(): Promise<string> {
    const accordionPO = new SciAccordionPO(this._locator.locator('sci-accordion.e2e-route-fragment'));
    await accordionPO.expand();
    try {
      return accordionPO.itemLocator().locator('span.e2e-route-fragment').innerText();
    }
    finally {
      await accordionPO.collapse();
    }
  }

  public async getReferrer(): Promise<WorkbenchPopupReferrer> {
    const accordionPO = new SciAccordionPO(this._locator.locator('sci-accordion.e2e-referrer'));
    await accordionPO.expand();
    try {
      return withoutUndefinedEntries({
        viewId: await accordionPO.itemLocator().locator('output.e2e-view-id').innerText(),
        viewCapabilityId: await accordionPO.itemLocator().locator('output.e2e-view-capability-id').innerText(),
      });
    }
    finally {
      await accordionPO.collapse();
    }
  }

  public async enterComponentSize(size: PopupSize): Promise<void> {
    await this._locator.locator('input.e2e-width').fill(size.width ?? '');
    await this._locator.locator('input.e2e-height').fill(size.height ?? '');
    await this._locator.locator('input.e2e-min-width').fill(size.minWidth ?? '');
    await this._locator.locator('input.e2e-max-width').fill(size.maxWidth ?? '');
    await this._locator.locator('input.e2e-min-height').fill(size.minHeight ?? '');
    await this._locator.locator('input.e2e-max-height').fill(size.maxHeight ?? '');
  }

  public async enterReturnValue(returnValue: string): Promise<void> {
    const accordionPO = new SciAccordionPO(this._locator.locator('sci-accordion.e2e-return-value'));
    await accordionPO.expand();
    try {
      await accordionPO.itemLocator().locator('input.e2e-return-value').fill(returnValue);
    }
    finally {
      await accordionPO.collapse();
    }
  }

  public async clickClose(options?: {returnValue?: string; closeWithError?: boolean}): Promise<void> {
    if (options?.returnValue !== undefined) {
      await this.enterReturnValue(options.returnValue);
    }

    if (options?.closeWithError === true) {
      await this._locator.locator('button.e2e-close-with-error').click();
    }
    else {
      await this._locator.locator('button.e2e-close').click();
    }
  }

  public async getSize(): Promise<Size> {
    const {width, height} = fromRect(await this._locator.boundingBox());
    return {width, height};
  }

  /**
   * Waits until this page gains focus.
   */
  public async waitForFocus(): Promise<void> {
    await this._hasFocusLocator.waitFor({state: 'visible'});
  }
}

export interface Size {
  width: number;
  height: number;
}
