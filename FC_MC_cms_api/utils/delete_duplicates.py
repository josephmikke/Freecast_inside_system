import json

import boto3
from boto3.dynamodb.conditions import Key

PROD_BUCKET = "cms-api-prod-cmsassetsbucket-1anox04n0s08h"
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('cms-prod')
mp = boto3.client('mediapackage-vod', region_name='us-east-1')
s3 = boto3.resource('s3')
api_prod_bucket = s3.Bucket(PROD_BUCKET)

def read_json(path):
    f = open(path)
    data = json.load(f)
    f.close()
    return data

def get_crackle_series():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#SERIES'),
        Limit=10000,
        FilterExpression=Key('provider').eq('fc0c3a60344a9a24')  # TODO:change provider id by Crackle one
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#SERIES'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            FilterExpression=Key('provider').eq('fc0c3a60344a9a24')  # TODO:change provider id by Crackle one
        )
        items.extend(response['Items'])
    return items


def get_series(id):
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


def delete_item(type, items):
    for item in items:
        table.delete_item(
            Key={
                'PK': '{}'.format(item['PK']),
                'SK': '{}'.format(item['SK'])
            }
        )
        print("{} deleted".format(type))


def delete_mediapackage_asset(assets, id):
    found = 0
    for asset in assets:
        if id in asset["Id"]:
            found = 1
            break
        continue
    if found == 1:
        try:
            mp.delete_asset(
                Id=asset["Id"]
            )
        except:
            print('not found')
        print("mp assets deleted")
    else:
        print("mp asset not found, deletion")


def delete_s3_items(asset_type, asset_id):
    for obj in api_prod_bucket.objects.filter(Prefix=asset_type + "/" + asset_id):
        # print(obj.key)
        obj.delete()
    print("s3 objects deleted")


series_guid = read_json('./popcorn-series-guid.json')
crackle_series = get_crackle_series()
mp_assets = read_json('./all-mp-assets.json')


for series in crackle_series:
    if any(json.loads(series["contentData"])["guid"] in series_guid["guid"] for series_guid in series_guid):
        print("duplicate found, url: https://main.dy6cf3t8c3zc7.amplifyapp.com/content/vod/{}/edit?type=series".format(series["id"]))
        series_ids = get_series(series["id"])
        episodes = [item for item in series_ids if 'EPISODE' in item['SK']]
        for episode in episodes:
            episode_ids = get_episode(episode['id'])
            for id in episode_ids:
                delete_mediapackage_asset(mp_assets, episode["id"])
                delete_s3_items("episodes", episode["id"])
            delete_item("episode", episode_ids)
        delete_s3_items("series", series["id"])
        delete_item("series", series_ids)