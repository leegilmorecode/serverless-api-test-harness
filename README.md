# Serverless API Test Harness

How to build a test harness for AWS Step Functions to produce a deterministic hermetic environment for e2e testing, using Jest and Typescript with the AWS CDK.

![image](./docs/images/header.png)

> Note: If you choose to deploy these resources you may be charged for usage.

You can find the associated article here: https://blog.serverlessadvocate.com/deterministic-api-test-harness-for-aws-step-function-e2e-tests-8cb641c01674

## Deploying

To deploy the solution first run `npm run deploy` in the `hotel-internal-apis` folder. Then run the same deploy command in the `james-gilmore-hotels` folder.
