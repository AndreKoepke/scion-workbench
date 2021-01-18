/*
 * Copyright (c) 2018-2019 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 *  SPDX-License-Identifier: EPL-2.0
 */

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Beans } from '@scion/toolkit/bean-manager';
import { ManifestService, MessageClient, MicroApplicationConfig } from '@scion/microfrontend-platform';
import { WorkbenchCapabilities } from '@scion/workbench-client';

@NgModule({
  providers: [],
  imports: [
    RouterModule.forChild([]),
  ],
})
export class ActivatorModule {

  constructor(private _manifestService: ManifestService, config: MicroApplicationConfig) {
    this.registerManifestObjects(config.symbolicName).then(() => Beans.get(MessageClient).publish('activator-ready'));
  }

  private async registerManifestObjects(appSymbolicName: string): Promise<void> {
    const app = /workbench-client-testing-(?<app>.+)/.exec(appSymbolicName).groups['app'];
    const heading = `${app}: Workbench Client E2E Testpage`;

    // Register view to interact with the workbench view object.
    await this._manifestService.registerCapability(
      {
        type: WorkbenchCapabilities.View,
        qualifier: {
          component: 'view',
          app,
        },
        optionalParams: ['initialTitle'],
        description: '[e2e] Provides access to the workbench view object',
        private: false,
        properties: {
          path: 'test-view',
          pinToStartPage: true,
          title: 'Workbench View',
          heading,
          cssClass: 'e2e-test-view',
        },
      });

    // Register view to navigate using the workbench router.
    await this._manifestService.registerCapability(
      {
        type: WorkbenchCapabilities.View,
        qualifier: {
          component: 'router',
          app,
        },
        description: '[e2e] Allows opening a microfrontend in a workbench view',
        private: false,
        properties: {
          path: 'test-router',
          pinToStartPage: true,
          title: 'Workbench Router',
          heading,
          cssClass: 'e2e-test-router',
        },
      });

    // Register view to register workbench capabilities dynamically at runtime.
    await this._manifestService.registerCapability(
      {
        type: WorkbenchCapabilities.View,
        qualifier: {
          component: 'register-workbench-capability',
          app,
        },
        description: '[e2e] Allows registering workbench capabilities',
        private: false,
        properties: {
          path: 'register-workbench-capability',
          pinToStartPage: true,
          title: 'Register Capability',
          heading,
          cssClass: 'e2e-register-workbench-capability',
        },
      },
    );

    // Register view to unregister workbench capabilities dynamically at runtime.
    await this._manifestService.registerCapability(
      {
        type: WorkbenchCapabilities.View,
        qualifier: {
          component: 'unregister-workbench-capability',
          app,
        },
        description: '[e2e] Allows unregistering workbench capabilities',
        private: false,
        properties: {
          path: 'unregister-workbench-capability',
          pinToStartPage: true,
          title: 'Unregister Capability',
          heading,
          cssClass: 'e2e-unregister-workbench-capability',
        },
      },
    );

    // Register view to register view intentions dynamically at runtime.
    await this._manifestService.registerCapability(
      {
        type: WorkbenchCapabilities.View,
        qualifier: {
          component: 'register-workbench-intention',
          app,
        },
        description: '[e2e] Allows registering view intentions',
        private: false,
        properties: {
          path: 'register-workbench-intention',
          pinToStartPage: true,
          title: 'Register Intention',
          heading,
          cssClass: 'e2e-register-workbench-intention',
        },
      },
    );
  }
}