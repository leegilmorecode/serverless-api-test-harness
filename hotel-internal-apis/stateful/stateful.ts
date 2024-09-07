import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

import { Construct } from 'constructs';

export interface HotelInternalApisStatefulStackProps extends cdk.StackProps {
  stage: string;
}

export class HotelInternalApisStatefulStack extends cdk.Stack {
  public table: dynamodb.Table;

  constructor(
    scope: Construct,
    id: string,
    props: HotelInternalApisStatefulStackProps
  ) {
    super(scope, id, props);

    // create our table which stores our bookings
    // Note: we are simulating three separate microservices here for demo only
    this.table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableName: `jg-hotels-bookings-table-${props.stage}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
