#!/bin/sh

#
# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.
#

set -e
./check_env_variables.sh

# Example: ./signals/finalize_signals_migration.sh eyJkZXN0aW5hdGlvbkluZGV4IjoiZGVzdGluYXRpb25JbmRleCIsInNvdXJjZUluZGV4Ijoic291cmNlSW5kZXgiLCJ0YXNrSWQiOm51bGx9
  curl -s -k \
  -H 'Content-Type: application/json' \
  -H 'kbn-xsrf: 123' \
  -u ${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD} \
  -X POST ${KIBANA_URL}${SPACE_URL}/api/detection_engine/signals/finalize_migration \
  -d "{\"migration_token\": \"$1\"}" \
  | jq .
