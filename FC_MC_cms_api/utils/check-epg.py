import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
bucket_name = "cms-api-prod-cmsassetsbucket-1anox04n0s08h"
table = dynamodb.Table('cms-prod')

def get_epgs():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPG'),
        Limit=10000,        
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPG'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
        )
        items.extend(response['Items'])
    
    for item in items:
        print(item["id"], item['name'])
    
    return items

def get_epgs_prgrams(id):
    response = table.query(
        KeyConditionExpression=Key('PK').eq('ASSET#EPG#{}'.format(id)),
        Limit=1000
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            KeyConditionExpression=Key('PK').eq('ASSET#EPG#{}'.format(id)),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=1000
        )
        items.extend(response['Items'])
    if len(items) > 0 :
        for item in items:
            if 'start_time' in item:
                print(item["id"], item['searchName'], item['start_time'], item['end_time'] )
            else :
                print(item["id"], item['entityType'])
            
            table.delete_item( Key={
                    'PK': '{}'.format(item['PK']),
                    'SK': '{}'.format(item['SK'])
                })
    return items

def get_eventbridge_schedules():
    client = boto3.client('scheduler')

    response = client.list_schedules()
    schedule_rules = [rule for rule in response['Schedules']]
    for schedule in schedule_rules:
        if "eb3e9c90c98db478-schedule" in schedule["Name"]:
            client.delete_schedule(Name='eb3e9c90c98db478-schedule')
    return schedule_rules

# get_eventbridge_schedules()
        

# get_epgs_prgrams('eb3e9c90c98db478')

def create_eventbridge_schedules():
    client = boto3.client('scheduler')
    # client.delete_schedule(
    #     Name='a1430a4ab8889e9f-schedule'
    # )

    client.create_schedule(
        Name = "0f75d53ee31405bc-test-schedule",
        FlexibleTimeWindow={
          "Mode": 'OFF',
        },
        ScheduleExpression= 'cron(*/5 * * * ? *)',
        # Target ={
        #   'Arn': 'arn:aws:lambda:us-east-1:199718138082:function:cms-api-prod-scheduleHandler',
        #   'RoleArn':'arn:aws:iam::199718138082:role/cms-api-prod-SchedulerInvokeRole-1IV90KJ1GHONE',
        #   'Input':"{\"epgId\":\"0f75d53ee31405bc\"}",
        #   'RetryPolicy': {
        #     'MaximumRetryAttempts': 0,
        #   },
        # },
        Target ={
          'Arn': 'arn:aws:lambda:us-east-1:199718138082:function:cms-api-test-scheduleHandler',
          'RoleArn':'arn:aws:iam::199718138082:role/cms-api-test-SchedulerInvokeRole-E2JGUBO5SEOW',
          'Input':"{\"epgId\":\"0f75d53ee31405bc\"}",
          'RetryPolicy': {
            'MaximumRetryAttempts': 0,
          },
        },
        ScheduleExpressionTimezone = 'Etc/GMT',
        State='ENABLED'
    )

create_eventbridge_schedules()