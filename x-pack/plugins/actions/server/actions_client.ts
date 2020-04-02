/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IScopedClusterClient,
  SavedObjectsClientContract,
  SavedObjectAttributes,
  SavedObject,
} from 'src/core/server';

import { ActionTypeRegistry } from './action_type_registry';
import { validateConfig, validateSecrets } from './lib';
import { ActionResult, FindActionResult, RawAction, PreConfiguredAction } from './types';

interface ActionUpdate extends SavedObjectAttributes {
  name: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

interface Action extends ActionUpdate {
  actionTypeId: string;
}

interface CreateOptions {
  action: Action;
}

interface FindOptions {
  options?: {
    perPage?: number;
    page?: number;
    search?: string;
    defaultSearchOperator?: 'AND' | 'OR';
    searchFields?: string[];
    sortField?: string;
    hasReference?: {
      type: string;
      id: string;
    };
    fields?: string[];
    filter?: string;
  };
}

interface FindResult {
  page: number;
  perPage: number;
  total: number;
  data: FindActionResult[];
}

interface ConstructorOptions {
  defaultKibanaIndex: string;
  scopedClusterClient: IScopedClusterClient;
  actionTypeRegistry: ActionTypeRegistry;
  savedObjectsClient: SavedObjectsClientContract;
  preconfiguredConnectors: PreConfiguredAction[];
}

interface UpdateOptions {
  id: string;
  action: ActionUpdate;
}

export class ActionsClient {
  private readonly defaultKibanaIndex: string;
  private readonly scopedClusterClient: IScopedClusterClient;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly actionTypeRegistry: ActionTypeRegistry;
  private readonly preconfiguredConnectors: PreConfiguredAction[];

  constructor({
    actionTypeRegistry,
    defaultKibanaIndex,
    scopedClusterClient,
    savedObjectsClient,
    preconfiguredConnectors,
  }: ConstructorOptions) {
    this.actionTypeRegistry = actionTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
    this.scopedClusterClient = scopedClusterClient;
    this.defaultKibanaIndex = defaultKibanaIndex;
    this.preconfiguredConnectors = preconfiguredConnectors;
  }

  /**
   * Create an action
   */
  public async create({ action }: CreateOptions): Promise<ActionResult> {
    const { actionTypeId, name, config, secrets } = action;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateConfig(actionType, config);
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets);

    this.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

    const result = await this.savedObjectsClient.create('action', {
      actionTypeId,
      name,
      config: validatedActionTypeConfig as SavedObjectAttributes,
      secrets: validatedActionTypeSecrets as SavedObjectAttributes,
    });

    return {
      id: result.id,
      actionTypeId: result.attributes.actionTypeId,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
    };
  }

  /**
   * Update action
   */
  public async update({ id, action }: UpdateOptions): Promise<ActionResult> {
    if (this.preconfiguredConnectors.find(pConnector => pConnector.id === id) !== undefined) {
      throw Error(`Preconfigured connector ${id} is not allowed to update.`);
    }
    const existingObject = await this.savedObjectsClient.get<RawAction>('action', id);
    const { actionTypeId } = existingObject.attributes;
    const { name, config, secrets } = action;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateConfig(actionType, config);
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets);

    this.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

    const result = await this.savedObjectsClient.update('action', id, {
      actionTypeId,
      name,
      config: validatedActionTypeConfig as SavedObjectAttributes,
      secrets: validatedActionTypeSecrets as SavedObjectAttributes,
    });

    return {
      id,
      actionTypeId: result.attributes.actionTypeId as string,
      name: result.attributes.name as string,
      config: result.attributes.config as Record<string, any>,
      isPreconfigured: false,
    };
  }

  /**
   * Get an action
   */
  public async get({ id }: { id: string }): Promise<ActionResult> {
    const preconfiguredConnector = this.preconfiguredConnectors.find(
      pConnector => pConnector.id === id
    );
    if (preconfiguredConnector !== undefined) {
      return {
        id,
        actionTypeId: preconfiguredConnector.actionTypeId,
        name: preconfiguredConnector.name,
        config: preconfiguredConnector.config,
        description: preconfiguredConnector.description,
        isPreconfigured: true,
      };
    }
    const result = await this.savedObjectsClient.get<RawAction>('action', id);

    return {
      id,
      actionTypeId: result.attributes.actionTypeId,
      name: result.attributes.name,
      config: result.attributes.config,
      isPreconfigured: false,
    };
  }

  /**
   * Get all actions connectors with preconfigured connectors
   */
  public async getAll(): Promise<FindActionResult[]> {
    const savedObjectsActions = (
      await this.savedObjectsClient.find<RawAction>({
        perPage: 10000,
        type: 'action',
      })
    ).saved_objects.map(actionFromSavedObject);

    const mergedResult = [...savedObjectsActions, ...this.preconfiguredConnectors];
    return await injectExtraFindData(
      this.defaultKibanaIndex,
      this.scopedClusterClient,
      mergedResult
    );
  }

  /**
   * Find actions (only saved objects actions)
   */
  public async find({ options = {} }: FindOptions): Promise<FindResult> {
    const findResult = await this.savedObjectsClient.find<RawAction>({
      ...options,
      type: 'action',
    });

    const data = await injectExtraFindData(
      this.defaultKibanaIndex,
      this.scopedClusterClient,
      findResult.saved_objects.map(actionFromSavedObject)
    );

    return {
      page: findResult.page,
      perPage: findResult.per_page,
      total: findResult.total,
      data,
    };
  }

  /**
   * Delete action
   */
  public async delete({ id }: { id: string }) {
    if (this.preconfiguredConnectors.find(pConnector => pConnector.id === id) !== undefined) {
      throw Error(`Preconfigured connector ${id} is not allowed to delete.`);
    }
    return await this.savedObjectsClient.delete('action', id);
  }
}

function actionFromSavedObject(savedObject: SavedObject<RawAction>): ActionResult {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
    isPreconfigured: false,
  };
}

async function injectExtraFindData(
  defaultKibanaIndex: string,
  scopedClusterClient: IScopedClusterClient,
  actionResults: ActionResult[]
): Promise<FindActionResult[]> {
  const aggs: Record<string, any> = {};
  for (const actionResult of actionResults) {
    aggs[actionResult.id] = {
      filter: {
        bool: {
          must: {
            nested: {
              path: 'references',
              query: {
                bool: {
                  filter: {
                    bool: {
                      must: [
                        {
                          term: {
                            'references.id': actionResult.id,
                          },
                        },
                        {
                          term: {
                            'references.type': 'action',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
  const aggregationResult = await scopedClusterClient.callAsInternalUser('search', {
    index: defaultKibanaIndex,
    body: {
      aggs,
      size: 0,
      query: {
        match_all: {},
      },
    },
  });
  return actionResults.map(actionResult => ({
    ...actionResult,
    referencedByCount: aggregationResult.aggregations[actionResult.id].doc_count,
  }));
}
