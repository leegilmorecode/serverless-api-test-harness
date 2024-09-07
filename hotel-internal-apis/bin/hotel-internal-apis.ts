#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';

import { HotelInternalApisStatefulStack } from '../stateful/stateful';
import { HotelInternalApisStatelessStack } from '../stateless/stateless';

const app = new cdk.App();

const statefulStack = new HotelInternalApisStatefulStack(
  app,
  'HotelInternalApisStatefulStack',
  {
    stage: 'develop',
  }
);
new HotelInternalApisStatelessStack(app, 'HotelInternalApisStatelessStack', {
  table: statefulStack.table,
  stage: 'develop',
});
