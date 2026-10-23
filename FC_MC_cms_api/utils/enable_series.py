import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('cms-prod')

def get_series():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#SERIES'),
        Limit=10000,
        FilterExpression=Key('provider').eq('216b0046cafcb78d') # PopCornFlix provider
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#SERIES'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            FilterExpression=Key('provider').eq('216b0046cafcb78d')
        )
        items.extend(response['Items'])
    return items

def update_series(id):
    table.update_item(
        Key={
            'PK': 'ASSET#SERIES#{}'.format(id),
            'SK': 'ASSET#SERIES#{}'.format(id)
        },
        UpdateExpression="SET enabled = :enabled",
        ExpressionAttributeValues={
            ':enabled': True
        },
        ReturnValues="UPDATED_NEW"
    )

for item in get_series():
    update_series(item["id"])