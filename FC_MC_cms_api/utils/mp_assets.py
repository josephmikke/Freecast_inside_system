import json

import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('cms-prod')
client = boto3.client('mediapackage-vod', region_name='us-east-1')


def episode_ids():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPISODE'),
        Limit=10000,
        # FilterExpression=Key('provider').eq('fc0c3a60344a9a24') # Crackle provider
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPISODE'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            # FilterExpression=Key('provider').eq('fc0c3a60344a9a24')
        )
        items.extend(response['Items'])
    return items


def movie_ids():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#MOVIE'),
        Limit=10000,
        # FilterExpression=Key('provider').eq('fc0c3a60344a9a24') # Crackle provider
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#MOVIE'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            # FilterExpression=Key('provider').eq('fc0c3a60344a9a24')
        )
        items.extend(response['Items'])
    return items


def get_items():
    response = client.list_assets(
        MaxResults=1000,
        PackagingGroupId='vod-prod'
    )
    items = response['Assets']
    while response.get('NextToken') is not None:
        response = client.list_assets(
            MaxResults=1000,
            PackagingGroupId='vod-prod',
            NextToken=response.get('NextToken')
        )
        items.extend(response['Assets'])
    return items

def read_json(path):
    f = open(path)
    data = json.load(f)
    f.close()
    return data

# get all MediaPackage items
# mp = read_json('./mediapackage-assets.json') # get_items()
#
# filtered_assets = []
#
# for item in mp:
#     if item["CreatedAt"] < "2023-09-29 11:47:50" and item["CreatedAt"] > "2023-09-25": # "2023-09-26T10:42:31+11:00":
#         filtered_assets.append(item)

with open('all-mp-assets.json', 'w') as f:
    json.dump(get_items(), f)
# ids = [movie['id'] for movie in movie_ids()]
# episodes = [episode['id'] for episode in episode_ids()]
# ids.append(episodes)


# item_found = 0
# item_not_found = 0
# for item in mp:
#     if any(item["Id"].split('_')[2] in s for s in ids):
#         item_found += 1
#     else:
#         print('item not found in db record {}'.format(item["Id"]))
#         # response = client.delete_asset(
#         #     Id=item["Id"]
#         # )
#         item_not_found += 1
#
# print('item_found {}'.format(item_found))
# print('item_not_found {}'.format(item_not_found))
# print(len(ids))



# delete episodes not found in MediaPackage