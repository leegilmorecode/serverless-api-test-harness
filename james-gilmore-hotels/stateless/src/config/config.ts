const convict = require('convict');

export const config = convict({
  stage: {
    doc: 'The currently deployed stage',
    format: String,
    default: '',
    env: 'STAGE',
  },
  configTableName: {
    doc: 'The config table name',
    format: String,
    default: '',
    env: 'CONFIG_TABLE_NAME',
  },
  configRestApiEndpoint: {
    doc: 'The config rest api endpoint name',
    format: String,
    default: 'hotel-booking-rest-api',
  },
}).validate({ allowed: 'strict' });
