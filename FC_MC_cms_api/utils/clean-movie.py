import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

table = dynamodb.Table('cms-prod')

movies = []

episodes = []

series = []


def get_movie(id):
    response = table.query(
        KeyConditionExpression=Key('PK').eq('ASSET#EPISODE#{}'.format(id)),
        Limit=1000
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            KeyConditionExpression=Key('PK').eq('ASSET#EPISODE#{}'.format(id)),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=1000
        )
        items.extend(response['Items'])
    return items


for movie in episodes:
    result = get_movie(movie)
    for item in result:
        print(table.delete_item(
            Key={
                'PK': '{}'.format(item['PK']),
                'SK': '{}'.format(item['SK'])
            }
        ))
