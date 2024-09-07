import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { Construct } from 'constructs';
import { SimpleTable } from '../app-constructs/simple-table';

export interface JamesGilmoreHotelsStatefulStackProps extends cdk.StackProps {
  stage: string;
}

export class JamesGilmoreHotelsStatefulStack extends cdk.Stack {
  public auditTable: dynamodb.Table;
  public configTable: dynamodb.Table;

  constructor(
    scope: Construct,
    id: string,
    props: JamesGilmoreHotelsStatefulStackProps
  ) {
    super(scope, id, props);

    // create the audit table for our workflow (storing workflow history)
    this.auditTable = new dynamodb.Table(this, 'AuditTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'type',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: `jg-hotels-audit-table-${props.stage}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // get the exported internal rest api value from ssm to build our dynamodb config item
    // (in reality we would have three distinct APIs, but this is a demo only)
    const restBookingApiUrl = ssm.StringParameter.fromStringParameterName(
      this,
      'RestApiBookingApiUrl',
      `/${props.stage}/hotel-internal-apis-url`
    ).stringValue;

    // this will be our config item in dynamodb (the rest api for the workflow to use)
    const configJson = {
      Item: {
        id: {
          S: 'hotel-booking-rest-api',
        },
        value: {
          S: restBookingApiUrl,
        },
      },
    };

    // create the config table for our workflow and add our one config item
    this.configTable = new SimpleTable(this, 'ConfigTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      nonStages: ['prod', 'staging'],
      stageName: props.stage,
      jsonData: configJson, // this allows us to pre-populate config in non prod
      tableName: `jg-hotels-config-table-${props.stage}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    }).table;
  }
}
