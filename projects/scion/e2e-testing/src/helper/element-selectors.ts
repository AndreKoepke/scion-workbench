/*
 * Copyright (c) 2018-2022 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms from the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {coerceArray} from './testing.util';

/**
 * Provides element selectors for SCION Workbench e2e tests.
 */
export namespace ElementSelectors {

  /**
   * Selects the <sci-router-outlet> element with the given name or that has set the given CSS class(es).
   */
  export function routerOutlet(outletNameOrSelector: string | RouterOutletSelector): string {
    if (typeof outletNameOrSelector === 'string') {
      return `sci-router-outlet[name="${outletNameOrSelector}"]`;
    }
    if (outletNameOrSelector.outletName) {
      return `sci-router-outlet[name="${outletNameOrSelector.outletName}"]`;
    }
    if (outletNameOrSelector.cssClass) {
      return `sci-router-outlet.${coerceArray(outletNameOrSelector.cssClass).join('.')}`;
    }
    throw Error('[RouterOutletSelectorError] Missing required outlet name or CSS class');
  }

  /**
   * Selects the iframe of the <sci-router-outlet> element with the given name or that has set the given CSS class(es).
   */
  export function routerOutletFrame(outletNameOrSelector: string | RouterOutletSelector): string {
    return `${routerOutlet(outletNameOrSelector)} iframe`;
  }
}

/**
 * Instructions for selecting a <sci-router-outlet> element.
 */
export interface RouterOutletSelector {
  outletName?: string;
  cssClass?: string | string[];
}
