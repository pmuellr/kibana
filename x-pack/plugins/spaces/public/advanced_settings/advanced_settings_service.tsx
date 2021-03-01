/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { AdvancedSettingsSetup } from 'src/plugins/advanced_settings/public';
import type { Space } from 'src/plugins/spaces_oss/common';

import { AdvancedSettingsSubtitle, AdvancedSettingsTitle } from './components';

interface SetupDeps {
  getActiveSpace: () => Promise<Space>;
  componentRegistry: AdvancedSettingsSetup['component'];
}

export class AdvancedSettingsService {
  public setup({ getActiveSpace, componentRegistry }: SetupDeps) {
    const PageTitle = () => <AdvancedSettingsTitle getActiveSpace={getActiveSpace} />;
    const SubTitle = () => <AdvancedSettingsSubtitle getActiveSpace={getActiveSpace} />;

    componentRegistry.register(
      componentRegistry.componentType.PAGE_TITLE_COMPONENT,
      PageTitle,
      true
    );
    componentRegistry.register(
      componentRegistry.componentType.PAGE_SUBTITLE_COMPONENT,
      SubTitle,
      true
    );
  }
}
