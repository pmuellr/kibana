/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingSetup, StackAlertsStartDeps } from '../../types';
import { getRuleType } from './rule_type';

// future enhancement: make these configurable?
export const MAX_INTERVALS = 1000;
export const MAX_GROUPS = 1000;
export const DEFAULT_GROUPS = 100;

interface RegisterParams {
  data: Promise<StackAlertsStartDeps['triggersActionsUi']['data']>;
  alerting: AlertingSetup;
}

export function register(params: RegisterParams) {
  const { data, alerting } = params;
  alerting.registerType(getRuleType(data));

  // _zdu: register the Jr version
  if (true) {
    const ruleType = getRuleType(data);
    ruleType.id = `${ruleType.id}-Jr`;
    ruleType.name = `${ruleType.name}-Jr`;
    alerting.registerType(ruleType);
  }
}
