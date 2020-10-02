/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Spaces } from '../../scenarios';
import {
  checkAAD,
  getUrlPrefix,
  getTestAlertData,
  ObjectRemover,
  ensureDatetimesAreOrdered,
} from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

interface AlertExecutionStatus {
  status: string;
  lastExecutionDate: string;
  error?: {
    reason: string;
    message: string;
  };
}

// eslint-disable-next-line import/no-default-export
export default function executionStatusAlertTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  // FLAKY: https://github.com/elastic/kibana/issues/79249
  describe.only('executionStatus', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(async () => await objectRemover.removeAll());

    it('should be "pending" for newly created alert', async () => {
      const dateStart = Date.now();
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(getTestAlertData());
      const dateEnd = Date.now();
      expect(response.status).to.eql(200);
      objectRemover.add(Spaces.space1.id, response.body.id, 'alert', 'alerts');

      expect(response.body.executionStatus).to.be.ok();
      const { status, lastExecutionDate, error } = response.body.executionStatus;
      expect(status).to.be('pending');
      ensureDatetimesAreOrdered([dateStart, lastExecutionDate, dateEnd]);
      expect(error).not.to.be.ok();

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    it('should eventually be "ok" for no-op alert', async () => {
      const dates = [];
      dates.push(Date.now());
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.noop',
            schedule: { interval: '1s' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      dates.push(response.body.executionStatus.lastExecutionDate);
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const executionStatus = await waitForStatus(alertId, new Set(['ok']));
      dates.push(executionStatus.lastExecutionDate);
      dates.push(Date.now());
      ensureDatetimesAreOrdered(dates);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    it('should eventually be "active" for firing alert', async () => {
      const dates = [];
      dates.push(Date.now());
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.patternFiring',
            schedule: { interval: '1s' },
            params: {
              pattern: { instance: trues(100) },
            },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      dates.push(response.body.executionStatus.lastExecutionDate);
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const executionStatus = await waitForStatus(alertId, new Set(['active']));
      dates.push(executionStatus.lastExecutionDate);
      dates.push(Date.now());
      ensureDatetimesAreOrdered(dates);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    it('should eventually be "error" for an error alert', async () => {
      const dates = [];
      dates.push(Date.now());
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.throw',
            schedule: { interval: '1s' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      dates.push(response.body.executionStatus.lastExecutionDate);
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const executionStatus = await waitForStatus(alertId, new Set(['error']));
      dates.push(executionStatus.lastExecutionDate);
      dates.push(Date.now());
      ensureDatetimesAreOrdered(dates);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    it('should clear the error when an error occurs and then recovers', async () => {
      const err = 'this alert is intended to fail';
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.patternFiring',
            schedule: { interval: '1s' },
            params: {
              pattern: { instance: [false, err, true] },
            },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      await waitForStatus(alertId, new Set(['ok']));
      let executionStatus = await waitForStatus(alertId, new Set(['error']));
      expect(executionStatus).to.be.ok();
      expect(executionStatus.status).to.be('error');
      expect(executionStatus.error).to.be.ok();

      executionStatus = await waitForStatus(alertId, new Set(['active']));
      expect(executionStatus).to.be.ok();
      expect(executionStatus.status).to.be('active');
      expect(executionStatus.error).to.be(undefined);

      // Ensure AAD isn't broken
      await checkAAD({
        supertest,
        spaceId: Spaces.space1.id,
        type: 'alert',
        id: response.body.id,
      });
    });

    // not sure how to test the read error reason!

    // note the decrypt error reason is tested in security_and_spaces, can't be tested
    // without security on

    it('should eventually have error reason "execute" when appropriate', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.throw',
            schedule: { interval: '1s' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      const executionStatus = await waitForStatus(alertId, new Set(['error']));
      expect(executionStatus.error).to.be.ok();
      expect(executionStatus.error!.reason).to.be('execute');
      expect(executionStatus.error!.message).to.be('this alert is intended to fail');
    });

    it('should eventually have error reason "unknown" when appropriate', async () => {
      const response = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.validation',
            schedule: { interval: '1s' },
            params: { param1: 'valid now, but will change to a number soon!' },
          })
        );
      expect(response.status).to.eql(200);
      const alertId = response.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      let executionStatus = await waitForStatus(alertId, new Set(['ok']));

      // break the validation of the params
      await supertest
        .put(`${getUrlPrefix(Spaces.space1.id)}/api/alerts_fixture/saved_object/alert/${alertId}`)
        .set('kbn-xsrf', 'foo')
        .send({
          attributes: {
            params: { param1: 42 },
          },
        })
        .expect(200);

      executionStatus = await waitForStatus(alertId, new Set(['error']));
      expect(executionStatus.error).to.be.ok();
      expect(executionStatus.error!.reason).to.be('unknown');

      const message = 'params invalid: [param1]: expected value of type [string] but got [number]';
      expect(executionStatus.error!.message).to.be(message);
    });

    it('should be able to find over all the fields', async () => {
      const startDate = Date.now();
      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.throw',
            schedule: { interval: '1s' },
          })
        );
      expect(createResponse.status).to.eql(200);
      const alertId = createResponse.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      await waitForStatus(alertId, new Set(['error']));

      let filter = `lastExecutionDate>${startDate}`;
      let executionStatus = await waitForFindStatus(alertId, new Set(['error']), filter);
      expectErrorExecutionStatus(executionStatus, startDate);

      filter = `status:error`;
      executionStatus = await find(alertId, filter);
      expectErrorExecutionStatus(executionStatus, startDate);

      filter = `error.message:*intended*`;
      executionStatus = await find(alertId, filter);
      expectErrorExecutionStatus(executionStatus, startDate);

      filter = `error.reason:execute`;
      executionStatus = await find(alertId, filter);
      expectErrorExecutionStatus(executionStatus, startDate);
    });

    it('should not be able to find over fields it should not find', async () => {
      const startDate = Date.now();
      const createResponse = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert`)
        .set('kbn-xsrf', 'foo')
        .send(
          getTestAlertData({
            alertTypeId: 'test.throw',
            schedule: { interval: '1s' },
          })
        );
      expect(createResponse.status).to.eql(200);
      const alertId = createResponse.body.id;
      objectRemover.add(Spaces.space1.id, alertId, 'alert', 'alerts');

      await waitForStatus(alertId, new Set(['error']));

      let filter = `lastExecutionDate>${startDate}`;
      await waitForFindStatus(alertId, new Set(['error']), filter);

      filter = `lastExecutionDate<${startDate}`;
      let executionStatus = await find(alertId, filter);
      expect(executionStatus).to.be(undefined);

      filter = `status:ok`;
      executionStatus = await find(alertId, filter);
      expect(executionStatus).to.be(undefined);

      filter = `error.message:*notintended*`;
      executionStatus = await find(alertId, filter);
      expect(executionStatus).to.be(undefined);

      filter = `error.reason:decrypt`;
      executionStatus = await find(alertId, filter);
      expect(executionStatus).to.be(undefined);
    });
  });

  const WaitForStatusMax = 30 * 1000;
  const WaitForStatusIncrement = 500;

  async function waitForStatus(
    id: string,
    statuses: Set<string>,
    waitMillis: number = WaitForStatusMax
  ): Promise<AlertExecutionStatus> {
    if (waitMillis < 0) {
      expect().fail(`waiting for alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const response = await supertest.get(
      `${getUrlPrefix(Spaces.space1.id)}/api/alerts/alert/${id}`
    );
    expect(response.status).to.eql(200);
    const { status } = response.body.executionStatus;

    const message = `waitForStatus(${Array.from(statuses)}): got ${JSON.stringify(
      response.body.executionStatus
    )}`;

    if (statuses.has(status)) {
      // eslint-disable-next-line no-console
      console.log(`${message}, found!`);
      return response.body.executionStatus;
    }

    // eslint-disable-next-line no-console
    console.log(`${message}, retrying`);

    await delay(WaitForStatusIncrement);
    return await waitForStatus(id, statuses, waitMillis - WaitForStatusIncrement);
  }

  async function waitForFindStatus(
    id: string,
    statuses: Set<string>,
    filter: string,
    waitMillis: number = WaitForStatusMax
  ): Promise<AlertExecutionStatus | undefined> {
    if (waitMillis < 0) {
      expect().fail(`waiting for find alert ${id} statuses ${Array.from(statuses)} timed out`);
    }

    const findUri = getFindUri(filter);
    const response = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/${findUri}`);

    expect(response.status).to.eql(200);
    const executionStatus = await find(id, filter);

    const message = `waitForFindStatus(${Array.from(statuses)}): got ${JSON.stringify(
      executionStatus
    )}`;

    if (executionStatus && statuses.has(executionStatus.status)) {
      // eslint-disable-next-line no-console
      console.log(`${message}, found!`);
      return executionStatus;
    }

    // eslint-disable-next-line no-console
    console.log(`${message}, retrying`);

    await delay(WaitForStatusIncrement);
    return await waitForFindStatus(id, statuses, filter, waitMillis - WaitForStatusIncrement);
  }

  async function find(id: string, filter: string): Promise<AlertExecutionStatus | undefined> {
    const findUri = getFindUri(filter);
    const response = await supertest.get(`${getUrlPrefix(Spaces.space1.id)}/${findUri}`);

    expect(response.status).to.eql(200);
    if (response.body.data.length === 0) return undefined;

    const result = response.body.data.find((obj: any) => obj.id === id);
    if (!result) return undefined;

    return result.executionStatus;
  }
}

function expectErrorExecutionStatus(
  executionStatus: AlertExecutionStatus | undefined,
  startDate: number
) {
  expect(executionStatus).to.be.ok();
  expect(executionStatus!.status).to.equal('error');

  const statusDate = Date.parse(`${executionStatus!.lastExecutionDate}`);
  const stopDate = Date.now();
  expect(startDate).to.be.lessThan(statusDate);
  expect(stopDate).to.be.greaterThan(statusDate);

  expect(executionStatus!.error).to.be.ok();
  expect(executionStatus!.error!.message).to.equal('this alert is intended to fail');
  expect(executionStatus!.error!.reason).to.equal('execute');
}

function getFindUri(filter: string) {
  return `api/alerts/_find?filter=alert.attributes.executionStatus.${filter}`;
}

function trues(length: number): boolean[] {
  return new Array(length).fill(true);
}

async function delay(millis: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, millis));
}
