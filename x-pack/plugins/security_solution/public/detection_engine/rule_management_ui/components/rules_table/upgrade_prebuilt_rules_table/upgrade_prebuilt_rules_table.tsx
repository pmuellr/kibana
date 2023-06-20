/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiProgress,
  EuiSkeletonLoading,
  EuiSkeletonText,
  EuiSkeletonTitle,
} from '@elastic/eui';
import React from 'react';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { RULES_TABLE_INITIAL_PAGE_SIZE, RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { UpgradePrebuiltRulesTableButtons } from './upgrade_prebuilt_rules_table_buttons';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';
import { UpgradePrebuiltRulesTableFilters } from './upgrade_prebuilt_rules_table_filters';
import { useUpgradePrebuiltRulesTableColumns } from './use_upgrade_prebuilt_rules_table_columns';

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_RULES_AVAILABLE_FOR_UPGRADE}</h3>}
    titleSize="s"
    body={i18n.NO_RULES_AVAILABLE_FOR_UPGRADE_BODY}
  />
);

/**
 * Table Component for displaying rules that have available updates
 */
export const UpgradePrebuiltRulesTable = React.memo(() => {
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

  const upgradeRulesTableContext = useUpgradePrebuiltRulesTableContext();

  const {
    state: { rules, filteredRules, isFetched, isLoading, isRefetching, selectedRules },
    actions: { selectRules },
  } = upgradeRulesTableContext;
  const rulesColumns = useUpgradePrebuiltRulesTableColumns();

  const isTableEmpty = isFetched && rules.length === 0;

  const shouldShowLinearProgress = (isFetched && isRefetching) || isUpgradingSecurityPackages;
  const shouldShowLoadingOverlay = !isFetched && isRefetching;

  return (
    <>
      {shouldShowLinearProgress && (
        <EuiProgress
          data-test-subj="loadingRulesInfoProgress"
          size="xs"
          position="absolute"
          color="accent"
        />
      )}
      <EuiSkeletonLoading
        isLoading={isLoading || shouldShowLoadingOverlay}
        loadingContent={
          <>
            <EuiSkeletonTitle />
            <EuiSkeletonText />
          </>
        }
        loadedContent={
          isTableEmpty ? (
            NO_ITEMS_MESSAGE
          ) : (
            <>
              <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false} wrap={true}>
                <EuiFlexItem grow={true}>
                  <UpgradePrebuiltRulesTableFilters />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <UpgradePrebuiltRulesTableButtons />
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiInMemoryTable
                items={filteredRules}
                sorting
                pagination={{
                  initialPageSize: RULES_TABLE_INITIAL_PAGE_SIZE,
                  pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
                }}
                isSelectable
                selection={{
                  selectable: () => true,
                  onSelectionChange: selectRules,
                  initialSelected: selectedRules,
                }}
                itemId="rule_id"
                data-test-subj="rules-upgrades-table"
                columns={rulesColumns}
              />
            </>
          )
        }
      />
    </>
  );
});

UpgradePrebuiltRulesTable.displayName = 'UpgradePrebuiltRulesTable';
