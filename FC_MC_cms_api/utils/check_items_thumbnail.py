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

platforms_id = [
    "366dfad672a26177",
    "4639d5ac33bdeddd",
    "8ad51dafa1294e3f",
    "f2ab2beb10b70bbe",
    "24a6abc468031566",
    "7b6201039c8a30f2",
    "ca779d41bfea40cf",
    "115c37eb65eb2591",
    "84d3761e1ada250c"
]


def fetchImageFromS3(key: str) -> bytes:
    response = s3.get_object(Bucket=bucket_name, Key=key)
    return response['Body'].read()


def check_thumbnail_extension(item: dict) -> bool:
    valid_extensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp']
    if item['thumbnail'].split('.')[-1] not in valid_extensions:
        return False
    return True


def check_thumbnail_binary(item: dict) -> bool:
    imageBinary = fetchImageFromS3(item['thumbnail'])
    try:
        Image.open(BytesIO(imageBinary))
    except:
        return False
    return True


#
# def check_thumbnail_binary2(item: dict) -> bool:
#    key = item['thumbnail']
#    url = generate_presigned_url(bucket_name, key)
#    response = requests.get(url)
#    try:
#        img = Image.open(BytesIO(response.content))
#    except:
#        return False
#    return True

def check_items_thumbnail(item: dict):
    # for item in items:
    content_data = json.loads(item["contentData"])
    # if contentData["thumbnail"] == 'default/nothumbnail/thumbnail.png':
    #     print('{} has no thumbnail'.format(item["id"]))
    process_thumbnails(content_data["thumbnails"], item["id"])
    # if item.get('thumbnail') is None:
    #     print(f"{item['name']} ({item['id']}): no thumbnail")
    #     # print(contentData["thumbnails"])
    # elif not check_thumbnail_extension(item):
    #     print(f"{item['name']} ({item['id']}) : {item['thumbnail'].split('.')[-1]} extension")
    #     process_thumbnails(contentData["thumbnails"], item["id"])
    #     # print(contentData["thumbnails"])
    # elif not check_thumbnail_binary(item):
    #     print(f"Invalid image binary for {item['name']} ({item['id']})")


def save_to_s3(url, id, name):
    response = requests.get(url)
    print(response.headers.get('Content-Type'))
    image = base64.b64encode(response.content)
    type = response.headers.get('Content-Type').split("/")[1]
    print("saving thumbnail to s3 cms-api-prod-cmsassetsbucket-1anox04n0s08h/series/{}/{}.{}".format(id, name, type))
    s3.put_object(Bucket=bucket_name,
                  Key="series/{}/{}.{}".format(id, name, type),
                  ContentType=response.headers.get('Content-Type'),
                  Metadata={
                      'verified': 'true'
                  },
                  Body=base64.b64decode(image))
    print("Done")
    # get bucket location
    # get object url
    print("https://dys9kbv5982ld.cloudfront.net/series/{}/{}.{}".format(id, name, type))
    # if name == 'alternate-thumbnail':
    # #    update_episodes(id, "episodes/{}/{}.{}".format(id, name, type), 'alternateThumbnail')
    #     update_series_alt_thumbnail(id, "series/{}/{}.{}".format(id, name, type), 'alternateThumbnail')
    # else:
    #     update_series_thumbnail(id, "series/{}/{}.{}".format(id, name, type), 'thumbnail')
    # update_series_alt_thumbnail(id, "movies/{}/{}.{}".format(id, name, type), 'thumbnail')
    # update_movie_thumbnail(id, "movies/{}/{}.{}".format(id, name, type), 'thumbnail')


def process_thumbnails(thumbnails: dict, id):
    list_of_thumbnails = []
    for thumbnail in thumbnails:
        if thumbnail["width"] == '1920' and thumbnail["height"] == '1080' and "ChannelArt" in thumbnail["url"]:
            print("found thumb")
            save_to_s3(thumbnail["url"], id, 'thumbnail')

    #        list_of_thumbnails.append(thumbnail)
    #if len(list_of_thumbnails) == 2:
    #    save_to_s3(list_of_thumbnails[0]["url"], id, 'alternate-thumbnail')
    #    save_to_s3(list_of_thumbnails[1]["url"], id, 'thumbnail')
    #elif len(list_of_thumbnails) == 1:
    #    save_to_s3(list_of_thumbnails[0]["url"], id, 'thumbnail')
    # if len(list_of_thumbnails) > 1:
    #    for key, thumbnail in enumerate(list_of_thumbnails):
    #        print(thumbnail)
    #        #if 'profiles' in thumbnail["url"]:
    #        #    save_to_s3(thumbnail["url"], id, 'thumbnail')
    #        #else:
    #        #    save_to_s3(thumbnail["url"], id, 'alternate-thumbnail')


def checkItemsByPK(PKValue: str):
    response = {}
    while True:
        if response == {}:
            response = table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1-PK').eq(PKValue),
                ExpressionAttributeNames={"#n": "name"},
                ProjectionExpression="#n, thumbnail, id"
            )
        else:
            response = table.query(
                IndexName='GSI1',
                KeyConditionExpression=Key('GSI1-PK').eq(PKValue),
                ExclusiveStartKey=response.get('LastEvaluatedKey'),
                ExpressionAttributeNames={"#name": "name"},
                ProjectionExpression="#name, thumbnail, id"
            )
        check_items_thumbnail(response['Items'])
        if response.get('LastEvaluatedKey') is None:
            break


def get_series():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#SERIES'),
        Limit=10000,
        FilterExpression=Key('provider').eq('fc0c3a60344a9a24') # Crackle provider
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#SERIES'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            FilterExpression=Key('provider').eq('fc0c3a60344a9a24')
        )
        items.extend(response['Items'])
    return items


def get_movies():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#MOVIE'),
        Limit=10000,
        FilterExpression=Key('provider').eq('fc0c3a60344a9a24')  # Crackle
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#MOVIE'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
            FilterExpression=Key('provider').eq('fc0c3a60344a9a24')  # Crackle
        )
        items.extend(response['Items'])
    return items

def get_episodes():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPISODE'),
        Limit=10000,
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPISODE'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=10000,
        )
        items.extend(response['Items'])
    return items


def update_episodes(id, thumbnail, attribute):
    table.update_item(
        Key={
            'PK': 'ASSET#EPISODE#{}'.format(id),
            'SK': 'ASSET#EPISODE#{}'.format(id)
        },
        UpdateExpression="SET {} = :thumbnail".format(attribute),
        ExpressionAttributeValues={
            ':thumbnail': thumbnail,
        },
        ReturnValues="UPDATED_NEW"
    )

def update_movie_thumbnail(id, thumbnail, attribute):
    table.update_item(
        Key={
            'PK': 'ASSET#MOVIE#{}'.format(id),
            'SK': 'ASSET#MOVIE#{}'.format(id)
        },
        UpdateExpression="SET {} = :thumbnail".format(attribute),
        ExpressionAttributeValues={
            ':thumbnail': thumbnail,
        },
        ReturnValues="UPDATED_NEW"
    )

def update_series_thumbnail(id, thumbnail, attribute):
    table.update_item(
        Key={
            'PK': 'ASSET#SERIES#{}'.format(id),
            'SK': 'ASSET#SERIES#{}'.format(id)
        },
        UpdateExpression="SET {} = :thumbnail".format(attribute),
        ExpressionAttributeValues={
            ':thumbnail': thumbnail,
        },
        ReturnValues="UPDATED_NEW"
    )

def update_series_alt_thumbnail(id, thumbnail, attribute):
    table.update_item(
        Key={
            'PK': 'ASSET#SERIES#{}'.format(id),
            'SK': 'ASSET#SERIES#{}'.format(id)
        },
        UpdateExpression="SET {} = :alternateThumbnail".format(attribute),
        ExpressionAttributeValues={
            ':alternateThumbnail': thumbnail,
        },
        ReturnValues="UPDATED_NEW"
    )


def update_movie(id):
    table.update_item(
        Key={
            'PK': 'ASSET#MOVIE#{}'.format(id),
            'SK': 'ASSET#MOVIE#{}'.format(id)
        },
        UpdateExpression="SET platforms = :platforms",
        ExpressionAttributeValues={
            ':platforms': platforms_id
        },
        ReturnValues="UPDATED_NEW"
    )

def update_movie_enabled(id):
    table.update_item(
        Key={
            'PK': 'ASSET#MOVIE#{}'.format(id),
            'SK': 'ASSET#MOVIE#{}'.format(id)
        },
        UpdateExpression="SET enabled = :enabled, platforms = :platforms",
        ExpressionAttributeValues={
            ':enabled': True,
            ':platforms': platforms_id
        },
        ReturnValues="UPDATED_NEW"
    )


def update_series(id):
    table.update_item(
        Key={
            'PK': 'ASSET#SERIES#{}'.format(id),
            'SK': 'ASSET#SERIES#{}'.format(id)
        },
        UpdateExpression="SET enabled = :enabled, platforms = :platforms",
        ExpressionAttributeValues={
            ':enabled': True,
            ':platforms': platforms_id
        },
        ReturnValues="UPDATED_NEW"
    )


def create_relations(id):
    items = []
    for platform in platforms_id:
        with table.batch_writer() as batch:
            batch.put_item(
                Item={
                    "PK": "ASSET#SERIES#{}".format(id),
                    "SK": "ASSET#PLATFORM#{}".format(platform),
                    "entityType": "SERIES",
                    "GSI1-PK": "ASSET#PLATFORM#{}".format(platform),
                    "GSI1-SK": "ASSET#SERIES#{}".format(id),
                    "id": id
                }
            )
def read_json(path):
    f = open(path)
    data = json.load(f)
    f.close()
    return data

def update_series_content_data(content_data, extId, id):
    response = table.update_item(
        Key={
            'PK': 'ASSET#SERIES#{}'.format(id),
            'SK': 'ASSET#SERIES#{}'.format(id)
        },
        UpdateExpression="SET contentData = :contentData, extId = :extId",
        ExpressionAttributeValues={
            ':extId': extId,
            ':contentData': content_data,
        },
        ReturnValues="UPDATED_NEW"
    )
    print(response)

series = get_series()
# movies = get_movies()


episodes = get_episodes()

for item in series:
    contentData = json.loads(item["contentData"])
    process_thumbnails(contentData["thumbnails"], item["id"])


# series = read_json('./series_id.json')

# for episode in episodes:
#     if any((episode["seriesId"] == job["id"]) for job in series):
#         print("episode is crackle episode, checking thumbnail")
#         contentData = json.loads(episode["contentData"])
#         process_thumbnails(contentData["thumbnails"], episode["id"])


#
#
#https://tv.springserve.com/vast/649879?w=1920&h=1080&cb={{CACHEBUSTER}}&ip={{IP}}&ua={{USER_AGENT}}&pod_max_dur={{POD_MAX_DUR}}&pod_ad_slots={{POD_AD_SLOTS}}&app_bundle={{APP_BUNDLE}}&app_name={{APP_NAME}}&app_store_url={{APP_STORE_URL}}&did={{DEVICE_ID}}&us_privacy={{US_PRIVACY}