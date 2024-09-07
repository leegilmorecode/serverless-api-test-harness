import {
  clearTable,
  generateRandomId,
  getItem,
  getParameter,
  httpCall,
  putItem,
  scanItems,
} from '@packages/aws-async-test-library';

import { config } from '@config';

let concreteInternalRestEndpoint: string;
let invokeEndpointUrl: string;
let testHarnessEndpointUrl: string;

// get our config constants
const configRestApiEndpoint = config.get('configRestApiEndpoint');
const stage = config.get('stage');

// set our determinstic values
const configTableName = `jg-hotels-config-table-${stage}`;
const auditTableName = `jg-hotels-audit-table-${stage}`;
const testHarnessTable = `api-test-harness-table-${stage}`;

describe('create-booking', () => {
  beforeAll(async () => {
    invokeEndpointUrl = await getParameter(`/${stage}/hotel-external-api-url`);
    testHarnessEndpointUrl = await getParameter(
      `/${stage}/api-test-harness-url`
    );

    // we get the actual concrete implementation value so we can revert this after a test run
    const result = await getItem(configTableName, 'id', configRestApiEndpoint);
    concreteInternalRestEndpoint = result.value;

    // we set the config table rest api to point to our test harness which we swap back later
    await putItem(configTableName, {
      id: configRestApiEndpoint,
      value: testHarnessEndpointUrl,
    });

    await clearTable(auditTableName, 'id', 'type');
    jest.retryTimes(1, { logErrorsBeforeRetry: false });
  });

  afterEach(async () => {
    // after each we clear down both tables
    await clearTable(auditTableName, 'id', 'type');
    await clearTable(testHarnessTable, 'pk', 'sk');
  }, 20000);

  afterAll(async () => {
    // revert the config back to point to the concrete rest implementation after all test runs
    await putItem(configTableName, {
      id: configRestApiEndpoint,
      value: concreteInternalRestEndpoint,
    });
  }, 20000);

  describe('on success', () => {
    it('should create the success audit records successfully', async () => {
      expect.assertions(3);

      // arrange
      const testId = generateRandomId();

      const payload = {
        customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
        roomType: 'Deluxe',
        checkIn: '2024-09-01',
        checkOut: '2024-09-05',
        treatment: 'Massage',
        spaDate: '2024-09-02',
        course: 'Ocean View',
        golfDate: '2024-09-03',
      };
      const resource = 'bookings';
      const method = 'POST';

      // add our test harness responses
      await putItem(testHarnessTable, {
        pk: testId,
        sk: 1,
        statusCode: 201,
        response: {
          customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
          roomType: 'Deluxe',
          checkIn: '2024-09-01',
          checkOut: '2024-09-05',
        },
      });
      await putItem(testHarnessTable, {
        pk: testId,
        sk: 2,
        statusCode: 201,
        response: {
          customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
          treatment: 'Massage',
          spaDate: '2024-09-02',
        },
      });
      await putItem(testHarnessTable, {
        pk: testId,
        sk: 3,
        statusCode: 201,
        response: {
          customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
          course: 'Ocean View',
          golfDate: '2024-09-03',
        },
      });

      // act - call the api endpoint to create a new booking (invokes express workflow)
      await httpCall(invokeEndpointUrl, resource, method, payload);

      // assert - get the audit records from the table
      const results = await scanItems(auditTableName, 5);

      expect(results[0]).toMatchObject({
        type: 'GolfBookingSuccess',
      });

      expect(results[1]).toMatchObject({
        type: 'HotelBookingSuccess',
      });

      expect(results[2]).toMatchObject({
        type: 'SPABookingSuccess',
      });
    }, 60000);
  });

  describe('on failure', () => {
    it('should write a failure audit record on hotel booking error', async () => {
      expect.assertions(2);

      // arrange
      const testId = generateRandomId();

      const payload = {
        customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
        roomType: 'Deluxe',
        checkIn: '2024-09-01',
        checkOut: '2024-09-05',
        treatment: 'Massage',
        spaDate: '2024-09-02',
        course: 'Ocean View',
        golfDate: '2024-09-03',
      };
      const resource = 'bookings';
      const method = 'POST';

      // add our test harness responses
      await putItem(testHarnessTable, {
        pk: testId,
        sk: 1,
        statusCode: 500, // force an error response on the test harness
        response: {
          message: 'An error has occured',
        },
      });

      // act - call the api endpoint to create a new booking (invokes express workflow)
      await httpCall(invokeEndpointUrl, resource, method, payload);

      // assert - get the audit records from the table
      const results = await scanItems(auditTableName, 5);

      expect(results.length).toEqual(1);

      expect(results[0]).toMatchObject({
        type: 'HotelBookingFailure',
      });
    }, 60000);

    it('should write one failure audit record on spa booking error', async () => {
      expect.assertions(3);

      // arrange
      const testId = generateRandomId();

      const payload = {
        customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
        roomType: 'Deluxe',
        checkIn: '2024-09-01',
        checkOut: '2024-09-05',
        treatment: 'Massage',
        spaDate: '2024-09-02',
        course: 'Ocean View',
        golfDate: '2024-09-03',
      };
      const resource = 'bookings';
      const method = 'POST';

      // add our test harness responses
      await putItem(testHarnessTable, {
        pk: testId,
        sk: 1,
        statusCode: 201,
        response: {
          customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
          roomType: 'Deluxe',
          checkIn: '2024-09-01',
          checkOut: '2024-09-05',
        },
      });

      await putItem(testHarnessTable, {
        pk: testId,
        sk: 2,
        statusCode: 500, // force an error response on the test harness
        response: {
          message: 'An error has occured',
        },
      });

      // act - call the api endpoint to create a new booking (invokes express workflow)
      await httpCall(invokeEndpointUrl, resource, method, payload);

      // assert - get the audit records from the table
      const results = await scanItems(auditTableName, 5);

      expect(results.length).toEqual(2);

      expect(results[0]).toMatchObject({
        type: 'HotelBookingSuccess',
      });

      expect(results[1]).toMatchObject({
        type: 'SPABookingFailure',
      });
    }, 60000);

    it('should write one failure audit record on golf booking error', async () => {
      expect.assertions(4);

      // arrange
      const testId = generateRandomId();

      const payload = {
        customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
        roomType: 'Deluxe',
        checkIn: '2024-09-01',
        checkOut: '2024-09-05',
        treatment: 'Massage',
        spaDate: '2024-09-02',
        course: 'Ocean View',
        golfDate: '2024-09-03',
      };
      const resource = 'bookings';
      const method = 'POST';

      // add our test harness responses
      await putItem(testHarnessTable, {
        pk: testId,
        sk: 1,
        statusCode: 201,
        response: {
          customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
          roomType: 'Deluxe',
          checkIn: '2024-09-01',
          checkOut: '2024-09-05',
        },
      });

      await putItem(testHarnessTable, {
        pk: testId,
        sk: 2,
        statusCode: 201,
        response: {
          customerId: '60cef317-1cdc-4ac2-aad8-1e2d7cb6f94c',
          treatment: 'Massage',
          spaDate: '2024-09-02',
        },
      });

      await putItem(testHarnessTable, {
        pk: testId,
        sk: 3,
        statusCode: 500, // force an error response on the test harness
        response: {
          message: 'An error has occured',
        },
      });

      // act - call the api endpoint to create a new booking (invokes express workflow)
      await httpCall(invokeEndpointUrl, resource, method, payload);

      // assert - get the audit records from the table
      const results = await scanItems(auditTableName, 5);

      expect(results.length).toEqual(3);

      expect(results[0]).toMatchObject({
        type: 'GolfBookingFailure',
      });

      expect(results[1]).toMatchObject({
        type: 'HotelBookingSuccess',
      });

      expect(results[2]).toMatchObject({
        type: 'SPABookingSuccess',
      });
    }, 60000);
  });
});
