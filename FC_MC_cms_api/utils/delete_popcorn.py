import base64
import json

import boto3
from PIL import Image
from io import BytesIO

from boto3 import s3
from boto3.dynamodb.conditions import Key

import requests

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
s3 = boto3.client('s3', region_name='us-east-1')
bucket_name = "cms-api-prod-cmsassetsbucket-1anox04n0s08h"
table = dynamodb.Table('cms-prod')

def get_series():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#SERIES'),
        Limit=10000,
        FilterExpression=Key('provider').eq('216b0046cafcb78d') # Popcorn provider
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#SERIES'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            FilterExpression=Key('provider').eq('216b0046cafcb78d')  # Popcorn
        )
        items.extend(response['Items'])
    return items


def get_movies():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#MOVIE'),
        Limit=10000,
        FilterExpression=Key('provider').eq('216b0046cafcb78d')  # Crackle
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#MOVIE'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            FilterExpression=Key('provider').eq('216b0046cafcb78d')  # Crackle
        )
        items.extend(response['Items'])
    return items

def get_episodes():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPISODE'),
        Limit=10000,
        FilterExpression=Key('provider').eq('216b0046cafcb78d')  # Crackle
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPISODE'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            FilterExpression=Key('provider').eq('216b0046cafcb78d')  # Crackle
        )
        items.extend(response['Items'])
    return items


def get_movie(id):
    print('ASSET#MOVIE#{}'.format(id))
    response = table.query(
        KeyConditionExpression=Key('PK').eq('ASSET#MOVIE#{}'.format(id)),
        Limit=1000
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            KeyConditionExpression=Key('PK').eq('ASSET#MOVIE#{}'.format(id)),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=1000
        )
        items.extend(response['Items'])
    return items

def get_episode(id):
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

def get_s(id):
    response = table.query(
        KeyConditionExpression=Key('PK').eq('ASSET#SERIES#{}'.format(id)),
        Limit=1000
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            KeyConditionExpression=Key('PK').eq('ASSET#SERIES#{}'.format(id)),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=1000
        )
        items.extend(response['Items'])
    return items


for movie in get_series():
    result = get_s(movie["id"])
    for item in result:
        print(item["SK"])
        table.delete_item(
            Key={
                'PK': '{}'.format(item['PK']),
                'SK': '{}'.format(item['SK'])
            }
        )