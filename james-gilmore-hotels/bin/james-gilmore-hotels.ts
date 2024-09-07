#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';

import { JamesGilmoreHotelsStatefulStack } from '../stateful/stateful';
import { JamesGilmoreHotelsStatelessStack } from '../stateless/stateless';

const app = new cdk.App();

const statefulStack = new JamesGilmoreHotelsStatefulStack(
  app,
  'JamesGilmoreHotelsStatefulStack',
  {
    stage: 'develop',
  }
);

new JamesGilmoreHotelsStatelessStack(app, 'JamesGilmoreHotelsStatelessStack', {
  stage: 'develop',
  auditTable: statefulStack.auditTable,
  configTable: statefulStack.configTable,
});
