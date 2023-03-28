/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SyntheticsNetworkEventsApiResponse,
  SyntheticsNetworkEventsApiResponseType,
} from '../../../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service';
import { FetchNetworkEventsParams } from './actions';

export async function fetchNetworkEvents(
  params: FetchNetworkEventsParams
): Promise<SyntheticsNetworkEventsApiResponse> {
  return (await apiService.get(
    SYNTHETICS_API_URLS.NETWORK_EVENTS,
    {
      checkGroup: params.checkGroup,
      stepIndex: params.stepIndex,
    },
    SyntheticsNetworkEventsApiResponseType
  )) as SyntheticsNetworkEventsApiResponse;
}
