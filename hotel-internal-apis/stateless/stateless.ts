import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { Construct } from 'constructs';

interface HotelInternalApisStatelessStackProps extends cdk.StackProps {
  table: dynamodb.Table;
  stage: string;
}

export class HotelInternalApisStatelessStack extends cdk.Stack {
  private table: dynamodb.Table;
  private api: apigateway.RestApi;

  constructor(
    scope: Construct,
    id: string,
    props: HotelInternalApisStatelessStackProps
  ) {
    super(scope, id, props);

    this.table = props.table;

    const lambdaPowerToolsConfig = {
      LOG_LEVEL: 'DEBUG',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
      POWERTOOLS_TRACE_ENABLED: 'enabled',
      POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: 'captureHTTPsRequests',
      POWERTOOLS_SERVICE_NAME: 'hotel-internal-services',
      POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'captureResult',
      POWERTOOLS_METRICS_NAMESPACE: 'hotel.internal.services.com',
    };

    const createHotelBooking: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'CreateHotelBooking', {
        functionName: 'create-hotel-booking',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          'src/adapters/primary/create-hotel-booking/create-hotel-booking.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        tracing: lambda.Tracing.ACTIVE,
        bundling: {
          minify: true,
          sourceMap: true,
        },
        environment: {
          NODE_OPTIONS: '--enable-source-maps',
          ...lambdaPowerToolsConfig,
          TABLE_NAME: this.table.tableName,
        },
      });

    const createSpaBooking: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'CreateSpaBooking', {
        functionName: 'create-spa-booking',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          'src/adapters/primary/create-spa-session/create-spa-session.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        tracing: lambda.Tracing.ACTIVE,
        bundling: {
          minify: true,
          sourceMap: true,
        },
        environment: {
          NODE_OPTIONS: '--enable-source-maps',
          ...lambdaPowerToolsConfig,
          TABLE_NAME: this.table.tableName,
        },
      });

    const createGolfBooking: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'CreateGolfBooking', {
        functionName: 'create-golf-booking',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          'src/adapters/primary/create-golf-session/create-golf-session.adapter.ts'
        ),
        memorySize: 1024,
        handler: 'handler',
        tracing: lambda.Tracing.ACTIVE,
        bundling: {
          minify: true,
          sourceMap: true,
        },
        environment: {
          NODE_OPTIONS: '--enable-source-maps',
          ...lambdaPowerToolsConfig,
          TABLE_NAME: this.table.tableName,
        },
      });

    // ensure our functions can write to the bookings table
    this.table.grantWriteData(createHotelBooking);
    this.table.grantWriteData(createGolfBooking);
    this.table.grantWriteData(createSpaBooking);

    // create the internal api gateway rest interface
    // Note: we are simulating three separate microservices here
    this.api = new apigateway.RestApi(this, 'HotelInternalApis', {
      restApiName: `${props.stage}-hotel-internal-apis`,
      description: `${props.stage} APIs for managing hotel, golf, and spa bookings.`,
      deploy: true,
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
      },
    });
    this.api.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // add our resources - outside of this demo these would be three independant apis
    const hotelBookings: apigw.Resource =
      this.api.root.addResource('hotel-bookings');
    const spaBookings: apigw.Resource =
      this.api.root.addResource('spa-bookings');
    const golfBookings: apigw.Resource =
      this.api.root.addResource('golf-bookings');

    // add our lambda integrations
    hotelBookings.addMethod(
      'POST',
      new apigw.LambdaIntegration(createHotelBooking, {
        proxy: true,
      })
    );

    golfBookings.addMethod(
      'POST',
      new apigw.LambdaIntegration(createGolfBooking, {
        proxy: true,
      })
    );

    spaBookings.addMethod(
      'POST',
      new apigw.LambdaIntegration(createSpaBooking, {
        proxy: true,
      })
    );

    // we push this to ssm so we can use it in our other service
    new ssm.StringParameter(this, 'HotelInternalApisUrl', {
      parameterName: `/${props.stage}/hotel-internal-apis-url`,
      stringValue: this.api.url,
    });
  }
}
