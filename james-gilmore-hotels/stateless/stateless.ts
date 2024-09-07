import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

import { ApiTestHarnessConstruct } from '../app-constructs/api-test-harness';
import { Construct } from 'constructs';

export interface JamesGilmoreHotelsStatelessStackProps extends cdk.StackProps {
  stage: string;
  auditTable: dynamodb.Table;
  configTable: dynamodb.Table;
}

export class JamesGilmoreHotelsStatelessStack extends cdk.Stack {
  private auditTable: dynamodb.Table;
  private configTable: dynamodb.Table;

  constructor(
    scope: Construct,
    id: string,
    props: JamesGilmoreHotelsStatelessStackProps
  ) {
    super(scope, id, props);

    const { auditTable, configTable } = props;

    this.auditTable = auditTable;
    this.configTable = configTable;

    const lambdaPowerToolsConfig = {
      LOG_LEVEL: 'DEBUG',
      POWERTOOLS_LOGGER_LOG_EVENT: 'true',
      POWERTOOLS_LOGGER_SAMPLE_RATE: '1',
      POWERTOOLS_TRACE_ENABLED: 'enabled',
      POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: 'captureHTTPsRequests',
      POWERTOOLS_SERVICE_NAME: 'jg-hotels-service',
      POWERTOOLS_TRACER_CAPTURE_RESPONSE: 'captureResult',
      POWERTOOLS_METRICS_NAMESPACE: 'jg.hotels.com',
    };

    // we create the api test harness only in lower environments
    if (props.stage !== 'prod' && props.stage !== 'staging') {
      new ApiTestHarnessConstruct(this, 'apiTestHarness', {
        stage: props.stage,
      });
    }

    // create lambda functions for each booking task which calls our different internal APIs
    const bookHotelBookingLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'BookHotelBookingLambda', {
        functionName: 'book-hotel-booking',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          'src/adapters/primary/book-hotel-booking/book-hotel-booking.adapter.ts'
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
          CONFIG_TABLE_NAME: configTable.tableName,
          ...lambdaPowerToolsConfig,
          // in non prod we have no caching of config
          POWERTOOLS_PARAMETERS_MAX_AGE:
            props.stage !== 'prod' && props.stage !== 'staging' ? '0' : '30',
        },
      });

    const bookSpaSessionLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'BookSpaSessionLambda', {
        functionName: 'book-spa-session',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          'src/adapters/primary/book-spa-session/book-spa-session.adapter.ts'
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
          CONFIG_TABLE_NAME: configTable.tableName,
          ...lambdaPowerToolsConfig,
          // in non prod we have no caching of config
          POWERTOOLS_PARAMETERS_MAX_AGE:
            props.stage !== 'prod' && props.stage !== 'staging' ? '0' : '30',
        },
      });

    const bookGolfSessionLambda: nodeLambda.NodejsFunction =
      new nodeLambda.NodejsFunction(this, 'BookGolfSessionLambda', {
        functionName: 'book-golf-session',
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(
          __dirname,
          'src/adapters/primary/book-golf-session/book-golf-session.adapter.ts'
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
          CONFIG_TABLE_NAME: configTable.tableName,
          ...lambdaPowerToolsConfig,
          // in non prod we have no caching of config
          POWERTOOLS_PARAMETERS_MAX_AGE:
            props.stage !== 'prod' && props.stage !== 'staging' ? '0' : '30',
        },
      });

    // allow the funcions to read the config table
    this.configTable.grantReadData(bookHotelBookingLambda);
    this.configTable.grantReadData(bookGolfSessionLambda);
    this.configTable.grantReadData(bookSpaSessionLambda);

    // create step functions tasks for lambda invocations
    const bookHotelRoomTask = new tasks.LambdaInvoke(this, 'BookHotelRoom', {
      lambdaFunction: bookHotelBookingLambda,
      inputPath: '$',
      payloadResponseOnly: true,
      payload: sfn.TaskInput.fromObject({
        customerId: sfn.JsonPath.stringAt('$.customerId'),
        roomType: sfn.JsonPath.stringAt('$.roomType'),
        checkIn: sfn.JsonPath.stringAt('$.checkIn'),
        checkOut: sfn.JsonPath.stringAt('$.checkOut'),
      }),
      resultSelector: {
        'statusCode.$': '$.statusCode',
        'response.$': '$.body',
      },
      resultPath: '$.hotelBookingResult',
    });

    const bookSpaSessionTask = new tasks.LambdaInvoke(this, 'BookSpaSession', {
      lambdaFunction: bookSpaSessionLambda,
      inputPath: '$',
      payloadResponseOnly: true,
      payload: sfn.TaskInput.fromObject({
        customerId: sfn.JsonPath.stringAt('$.customerId'),
        treatment: sfn.JsonPath.stringAt('$.treatment'),
        spaDate: sfn.JsonPath.stringAt('$.spaDate'),
      }),
      resultSelector: {
        'statusCode.$': '$.statusCode',
        'response.$': '$.body',
      },
      resultPath: '$.spaBookingResult',
    });

    const bookGolfSessionTask = new tasks.LambdaInvoke(
      this,
      'BookGolfSession',
      {
        lambdaFunction: bookGolfSessionLambda,
        inputPath: '$',
        payloadResponseOnly: true,
        payload: sfn.TaskInput.fromObject({
          customerId: sfn.JsonPath.stringAt('$.customerId'),
          course: sfn.JsonPath.stringAt('$.course'),
          golfDate: sfn.JsonPath.stringAt('$.golfDate'),
        }),
        resultSelector: {
          'statusCode.$': '$.statusCode',
          'response.$': '$.body',
        },
        resultPath: '$.golfBookingResult',
      }
    );

    // write successful audit records on step success
    const writeHotelSuccessAudit = new tasks.DynamoPutItem(
      this,
      'WriteHotelSuccessAudit',
      {
        table: this.auditTable,
        resultPath: sfn.JsonPath.DISCARD,
        item: {
          id: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Id')
          ),
          type: tasks.DynamoAttributeValue.fromString('HotelBookingSuccess'),
          timestamp: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.EnteredTime')
          ),
        },
      }
    );

    const writeSPASuccessAudit = new tasks.DynamoPutItem(
      this,
      'WriteSpaSuccessAudit',
      {
        table: auditTable,
        resultPath: sfn.JsonPath.DISCARD,
        item: {
          id: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Id')
          ),
          type: tasks.DynamoAttributeValue.fromString('SPABookingSuccess'),
          timestamp: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.EnteredTime')
          ),
        },
      }
    );

    const writeGolfSuccessAudit = new tasks.DynamoPutItem(
      this,
      'WriteGolfSuccessAudit',
      {
        table: this.auditTable,
        item: {
          id: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Id')
          ),
          type: tasks.DynamoAttributeValue.fromString('GolfBookingSuccess'),
          timestamp: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.EnteredTime')
          ),
        },
      }
    );

    // write a failure audit record on error
    const writeHotelFailureAudit = new tasks.DynamoPutItem(
      this,
      'WriteHotelFailureAudit',
      {
        table: this.auditTable,
        item: {
          id: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Id')
          ),
          type: tasks.DynamoAttributeValue.fromString('HotelBookingFailure'),
          timestamp: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.EnteredTime')
          ),
        },
      }
    );

    const writeSPAFailureAudit = new tasks.DynamoPutItem(
      this,
      'WriteSpaFailureAudit',
      {
        table: this.auditTable,
        item: {
          id: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Id')
          ),
          type: tasks.DynamoAttributeValue.fromString('SPABookingFailure'),
          timestamp: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.EnteredTime')
          ),
        },
      }
    );

    const writeGolfFailureAudit = new tasks.DynamoPutItem(
      this,
      'WriteGolfFailureAudit',
      {
        table: this.auditTable,
        item: {
          id: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.Execution.Id')
          ),
          type: tasks.DynamoAttributeValue.fromString('GolfBookingFailure'),
          timestamp: tasks.DynamoAttributeValue.fromString(
            sfn.JsonPath.stringAt('$$.State.EnteredTime')
          ),
        },
      }
    );

    // define the three choice states
    const hotelBookingSuccess = new sfn.Choice(this, 'Hotel Booking Success?');
    const spaBookingSuccess = new sfn.Choice(this, 'SPA Booking Success?');
    const golfBookingSuccess = new sfn.Choice(this, 'Golf Booking Success?');

    // define success and failure states
    const successState = new sfn.Succeed(this, 'Success', {
      comment: 'Booking successful',
    });

    const failState = new sfn.Fail(this, 'Fail', {
      error: 'BookingFailed',
      cause: 'One or more booking tasks failed',
    });

    // create the state machine as an express type
    const stateMachine = new sfn.StateMachine(
      this,
      'HotelBookingStateMachine',
      {
        tracingEnabled: true,
        logs: {
          level: sfn.LogLevel.ALL,
          includeExecutionData: true,
          destination: new logs.LogGroup(this, 'HotelBookingStateMachineLogs'),
        },
        definitionBody: sfn.DefinitionBody.fromChainable(
          sfn.Chain.start(bookHotelRoomTask).next(
            hotelBookingSuccess
              .when(
                sfn.Condition.numberEquals(
                  '$.hotelBookingResult.statusCode',
                  201
                ),
                writeHotelSuccessAudit
                  .next(bookSpaSessionTask)
                  .next(
                    spaBookingSuccess
                      .when(
                        sfn.Condition.numberEquals(
                          '$.spaBookingResult.statusCode',
                          201
                        ),
                        writeSPASuccessAudit
                          .next(bookGolfSessionTask)
                          .next(
                            golfBookingSuccess
                              .when(
                                sfn.Condition.numberEquals(
                                  '$.golfBookingResult.statusCode',
                                  201
                                ),
                                writeGolfSuccessAudit.next(successState)
                              )
                              .otherwise(writeGolfFailureAudit.next(failState))
                          )
                      )
                      .otherwise(writeSPAFailureAudit.next(failState))
                  )
              )
              .otherwise(writeHotelFailureAudit.next(failState))
          )
        ),
        stateMachineType: sfn.StateMachineType.EXPRESS,
        timeout: cdk.Duration.seconds(29),
      }
    );

    // create the api gateway role
    const apiGatewayRole = new iam.Role(this, 'ApiGatewayStepFunctionRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
    });

    apiGatewayRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['states:StartSyncExecution'],
        resources: [stateMachine.stateMachineArn],
      })
    );

    // allow the api gateway role to execute the state machine
    stateMachine.grantStartExecution(apiGatewayRole);

    // create the rest api for creating our booking
    const api = new apigw.RestApi(this, 'HotelBookingApi', {
      restApiName: 'Hotel Booking Service',
      deploy: true,
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
      },
    });
    api.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // create the api gateway integration with the express step function for synchronous execution
    const integration = new apigw.AwsIntegration({
      service: 'states',
      action: 'StartSyncExecution',
      options: {
        credentialsRole: apiGatewayRole,
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': 'Success',
            },
          },
        ],
        requestTemplates: {
          'application/json': `{
            "input": "$util.escapeJavaScript($input.body)",
            "stateMachineArn": "${stateMachine.stateMachineArn}"
          }`,
        },
      },
    });

    // create the booking resource for a post request
    const bookingResource = api.root.addResource('bookings');
    bookingResource.addMethod('POST', integration, {
      methodResponses: [{ statusCode: '200' }],
    });

    // push the external api value to ssm
    new ssm.StringParameter(this, 'HotelExternalApiUrlParam', {
      parameterName: `/${props.stage}/hotel-external-api-url`,
      stringValue: api.url,
    });
  }
}
