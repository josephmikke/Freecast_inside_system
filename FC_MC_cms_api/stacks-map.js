module.exports = (resource, logicalId) => {
  // SSM bridge parameters must stay in the root stack.
  if (resource.Type === 'AWS::SSM::Parameter') {
    return false;
  }

  // API Gateway routes, deployments, and invoke permissions reference each
  // other and Lambda functions. Moving any of them to nested stacks causes
  // CloudFormation circular dependencies — keep the whole graph in root.
  if (
    resource.Type.startsWith('AWS::ApiGateway::')
    && resource.Type !== 'AWS::ApiGateway::RestApi'
  ) {
    return false;
  }

  if (resource.Type === 'AWS::Lambda::Permission') {
    return false;
  }

  const destinationByType = {
    'AWS::Logs::LogGroup': 'LogGroups',
    'AWS::Events::Rule': 'EventRules',
    'AWS::Lambda::EventInvokeConfig': 'LambdaEventInvoke',
    'AWS::Scheduler::Schedule': 'SchedulerSchedules',
  };

  if (destinationByType[resource.Type]) {
    return { destination: destinationByType[resource.Type] };
  }

  return null;
};
