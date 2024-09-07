import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Deploy from 'aws-cdk-lib/aws-s3-deployment';

import { Construct } from 'constructs';

interface SimpleTableProps
  extends Pick<
    dynamodb.TableProps,
    'removalPolicy' | 'partitionKey' | 'tableName' | 'sortKey'
  > {
  /**
   * The stage name which the dynamodb table is being used with
   */
  stageName: string;
  /**
   * The partition key attribute for the table
   */
  partitionKey: dynamodb.Attribute;
  /**
   * The removal policy for the table
   */
  removalPolicy: cdk.RemovalPolicy;
  /**
   * The stages where we don't want to autopopulate the table (typically prod)
   */
  nonStages?: string[];
  /**
   * The optional json data
   */
  jsonData?: Record<string, any>;
}

type FixedSimpleTableProps = Omit<
  dynamodb.TableProps,
  'removalPolicy' | 'partitionKey' | 'tableName' | 'sortKey'
>;

export class SimpleTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: SimpleTableProps) {
    super(scope, id);

    let importSource;
    let deployment;

    if (
      props.nonStages &&
      props.nonStages.includes(props.stageName) &&
      !props.jsonData
    ) {
      throw new Error(
        'json data is required when stages is set and the stage is not included in nonStages'
      );
    }

    const fixedProps: FixedSimpleTableProps = {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      contributorInsightsEnabled: true,
    };

    // if it is a non prod environment (typically prod or staging) we deploy
    if (props.nonStages && !props.nonStages.includes(props.stageName)) {
      if (!props.jsonData) {
        throw new Error('json data is required when suppling nonStages value');
      }

      const bucket = new s3.Bucket(this, 'Bucket', {
        autoDeleteObjects: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      // create the deployment of the local json into s3 for the table import
      deployment = new s3Deploy.BucketDeployment(this, 'BucketDeployment', {
        sources: [s3Deploy.Source.jsonData('config-data.json', props.jsonData)],
        destinationBucket: bucket,
      });

      // we only pre-populate the table in non prod stages
      importSource = {
        bucket,
        // we are setting these as fixed props for this example only
        inputFormat: dynamodb.InputFormat.dynamoDBJson(),
        compressionType: dynamodb.InputCompressionType.NONE,
      };

      deployment.node.addDependency(bucket);
    }

    this.table = new dynamodb.Table(this, id, {
      // fixed props
      ...fixedProps,
      importSource: importSource,
      // custom props
      ...props,
    });

    // if it is a non prod environment (typically prod or staging) we deploy
    if (props.nonStages && !props.nonStages.includes(props.stageName)) {
      this.table.node.addDependency(deployment as s3Deploy.BucketDeployment);
    }
  }
}
