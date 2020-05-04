/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createPermissionFailureMessage } from '../../../../../capabilities/check_capabilities';
import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';

export const CreateAnalyticsButton: FC<CreateAnalyticsFormProps> = props => {
  const { disabled } = props.state;
  const { openModal } = props.actions;

  const button = (
    <EuiButton
      disabled={disabled}
      fill
      onClick={openModal}
      iconType="plusInCircle"
      size="s"
      data-test-subj="mlAnalyticsButtonCreate"
    >
      {i18n.translate('xpack.ml.dataframe.analyticsList.createDataFrameAnalyticsButton', {
        defaultMessage: 'Create analytics job',
      })}
    </EuiButton>
  );

  if (disabled) {
    return (
      <EuiToolTip
        position="top"
        content={createPermissionFailureMessage('canCreateDataFrameAnalytics')}
      >
        {button}
      </EuiToolTip>
    );
  }

  return button;
};
