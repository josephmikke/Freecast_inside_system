import json
import re
import base64
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr, Key

mediaconvert = boto3.client('mediaconvert', region_name='us-east-1',
                            endpoint_url='https://lxlxpswfb.mediaconvert.us-east-1.amazonaws.com')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('cms-prod')

EXPECTED_AD_DURATION_SECONDS = 60


def read_json(path):
    f = open(path)
    data = json.load(f)
    f.close()
    return data


def get_episodes():
    response = table.query(
        IndexName='GSI1',
        KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPISODE'),
        Limit=1000
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI1',
            KeyConditionExpression=Key('GSI1-PK').eq('ASSET#EPISODE'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=1000
        )
        items.extend(response['Items'])
    return items


def seconds_to_pts(seconds):
    return int(seconds * 90000)


def calculate_crc32_mpeg2(data):
    """Calculate CRC32-MPEG2 for SCTE-35"""
    crc = 0xFFFFFFFF
    polynomial = 0x04C11DB7
    for byte in data:
        crc ^= byte << 24
        for _ in range(8):
            if crc & 0x80000000:
                crc = ((crc << 1) ^ polynomial) & 0xFFFFFFFF
            else:
                crc = (crc << 1) & 0xFFFFFFFF
    return crc


def generate_splice_insert_cue_out_base64(splice_event_id, pts_time):
    """Generate SCTE-35 SpliceInsert for CUE-OUT with outOfNetworkIndicator=true, duration=0
    
    IMPORTANT: BreakDuration MUST be 0 for MediaPackage to emit presentationTime on DASH <Event>.
    If BreakDuration > 0, MediaPackage drops presentationTime which breaks MediaTailor ad insertion.
    Ad break duration is controlled via #EXT-X-CUE-OUT:60 (HLS) and pod_duration param (DASH/MediaTailor).
    """
    buffer = []
    
    buffer.append(0xFC)
    
    section_length_pos = len(buffer)
    buffer.extend([0x30, 0x00])
    
    buffer.append(0x00)
    buffer.extend([0x00, 0x00, 0x00, 0x00, 0x00])
    buffer.append(0x00)
    
    tier_cmd_length_pos = len(buffer)
    buffer.extend([0xFF, 0xF0, 0x00])
    
    buffer.append(0x05)
    
    splice_insert_start = len(buffer)
    
    buffer.append((splice_event_id >> 24) & 0xFF)
    buffer.append((splice_event_id >> 16) & 0xFF)
    buffer.append((splice_event_id >> 8) & 0xFF)
    buffer.append(splice_event_id & 0xFF)
    
    buffer.append(0x7F)
    buffer.append(0xEF)
    
    buffer.append(0xFE | ((pts_time >> 32) & 0x01))
    buffer.append((pts_time >> 24) & 0xFF)
    buffer.append((pts_time >> 16) & 0xFF)
    buffer.append((pts_time >> 8) & 0xFF)
    buffer.append(pts_time & 0xFF)
    
    buffer.extend([0xFE, 0x00, 0x00, 0x00, 0x00])
    
    buffer.extend([0x00, 0x01, 0x00, 0x00])
    
    splice_insert_end = len(buffer)
    splice_command_length = splice_insert_end - splice_insert_start
    
    buffer.extend([0x00, 0x00])
    
    section_length = len(buffer) - 3 + 4
    buffer[section_length_pos] = 0x30 | ((section_length >> 8) & 0x0F)
    buffer[section_length_pos + 1] = section_length & 0xFF
    
    buffer[tier_cmd_length_pos + 1] = 0xF0 | ((splice_command_length >> 8) & 0x0F)
    buffer[tier_cmd_length_pos + 2] = splice_command_length & 0xFF
    
    crc = calculate_crc32_mpeg2(buffer)
    buffer.append((crc >> 24) & 0xFF)
    buffer.append((crc >> 16) & 0xFF)
    buffer.append((crc >> 8) & 0xFF)
    buffer.append(crc & 0xFF)
    
    return base64.b64encode(bytes(buffer)).decode('utf-8')


def generate_splice_insert_cue_in_base64(splice_event_id, pts_time):
    """Generate SCTE-35 SpliceInsert for CUE-IN with outOfNetworkIndicator=false"""
    buffer = []
    
    buffer.append(0xFC)
    
    section_length_pos = len(buffer)
    buffer.extend([0x30, 0x00])
    
    buffer.append(0x00)
    buffer.extend([0x00, 0x00, 0x00, 0x00, 0x00])
    buffer.append(0x00)
    
    tier_cmd_length_pos = len(buffer)
    buffer.extend([0xFF, 0xF0, 0x00])
    
    buffer.append(0x05)
    
    splice_insert_start = len(buffer)
    
    buffer.append((splice_event_id >> 24) & 0xFF)
    buffer.append((splice_event_id >> 16) & 0xFF)
    buffer.append((splice_event_id >> 8) & 0xFF)
    buffer.append(splice_event_id & 0xFF)
    
    buffer.append(0x7F)
    buffer.append(0x4F)
    
    buffer.append(0xFE | ((pts_time >> 32) & 0x01))
    buffer.append((pts_time >> 24) & 0xFF)
    buffer.append((pts_time >> 16) & 0xFF)
    buffer.append((pts_time >> 8) & 0xFF)
    buffer.append(pts_time & 0xFF)
    
    buffer.extend([0x00, 0x01, 0x00, 0x00])
    
    splice_insert_end = len(buffer)
    splice_command_length = splice_insert_end - splice_insert_start
    
    buffer.extend([0x00, 0x00])
    
    section_length = len(buffer) - 3 + 4
    buffer[section_length_pos] = 0x30 | ((section_length >> 8) & 0x0F)
    buffer[section_length_pos + 1] = section_length & 0xFF
    
    buffer[tier_cmd_length_pos + 1] = 0xF0 | ((splice_command_length >> 8) & 0x0F)
    buffer[tier_cmd_length_pos + 2] = splice_command_length & 0xFF
    
    crc = calculate_crc32_mpeg2(buffer)
    buffer.append((crc >> 24) & 0xFF)
    buffer.append((crc >> 16) & 0xFF)
    buffer.append((crc >> 8) & 0xFF)
    buffer.append(crc & 0xFF)
    
    return base64.b64encode(bytes(buffer)).decode('utf-8')


def generateScc(cuePoints):
    """Generate SCC XML - single signal per cue point"""
    signals = []
    for idx, point in enumerate(cuePoints):
        point = point.strip()
        cuePointMatches = re.match(r"(\d+\.?\d*)", point)
        if not cuePointMatches:
            raise Exception('Scc: Invalid cue point: {}'.format(point))
        
        cue_seconds = float(cuePointMatches[1])
        signal_id = idx + 1
        
        signals.append(
            '<ResponseSignal acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="{}" signalPointID="{}" action="create">'
            '<sig:NPTPoint nptPoint="{}"/>'
            '<sig:SCTE35PointDescriptor spliceCommandType="05">'
            '<sig:SegmentationDescriptorInfo segmentEventId="{}" segmentTypeId="52" upidType="9" upid="{}" segmentNumber="0" segmentsExpected="1"/>'
            '</sig:SCTE35PointDescriptor>'
            '</ResponseSignal>'
            '<ConditioningInfo acquisitionSignalIDRef="{}" startOffset="PT{}S" duration="PT0S"/>'.format(
                signal_id, signal_id, cue_seconds, signal_id, signal_id, signal_id, cue_seconds
            )
        )
    
    return '<?xml version="1.0" encoding="UTF-8"?>' \
           '<SignalProcessingNotification xmlns="urn:cablelabs:iptvservices:esam:xsd:signal:1" xmlns:sig="urn:cablelabs:md:xsd:signaling:3.0" xmlns:common="urn:cablelabs:iptvservices:esam:xsd:common:1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" acquisitionPointIdentity="InsertionESAM">' \
           '<common:BatchInfo batchId="1">' \
           '<common:Source xsi:type="content:MovieType" />' \
           '</common:BatchInfo>' \
           '{}'.format(''.join(signals)) + \
           '</SignalProcessingNotification>'


def generateMcc(cuePoints):
    """
    Generate MCC XML - places BOTH CUE-OUT and CUE-IN on the SAME segment.
    Per Telos requirements: no media segments between CUE-OUT and CUE-IN for INSERT behavior.
    """
    responses = []
    for idx, point in enumerate(cuePoints):
        point = point.strip()
        cuePointMatches = re.match(r"(\d+\.?\d*)", point)
        if not cuePointMatches:
            raise Exception('Mcc: Invalid cue point: {}'.format(point))
        
        cue_seconds = float(cuePointMatches[1])
        pts_time = seconds_to_pts(cue_seconds)
        signal_id = idx + 1
        
        scte35_cue_out = generate_splice_insert_cue_out_base64(signal_id, pts_time)
        scte35_cue_in = generate_splice_insert_cue_in_base64(signal_id, pts_time)
        
        responses.append(
            '<ns2:ManifestResponse acquisitionPointIdentity="InsertionESAM" acquisitionSignalID="{}" dataPassThrough="true">'
            '<ns2:SegmentModify>'
            '<ns2:FirstSegment>'
            '<ns2:Tag value="#EXT-OATCLS-SCTE35:{}" />'
            '<ns2:Tag value="#EXT-X-CUE-OUT:{}" />'
            '<ns2:Tag value="#EXT-OATCLS-SCTE35:{}" />'
            '<ns2:Tag value="#EXT-X-CUE-IN" />'
            '</ns2:FirstSegment>'
            '</ns2:SegmentModify>'
            '</ns2:ManifestResponse>'.format(
                signal_id, scte35_cue_out, EXPECTED_AD_DURATION_SECONDS, scte35_cue_in
            )
        )

    return '<?xml version="1.0" encoding="utf-8" standalone="yes"?>' \
           '<ns2:ManifestConfirmConditionNotification xmlns:ns2="http://www.cablelabs.com/namespaces/metadata/xsd/confirmation/2" xmlns="http://www.cablelabs.com/namespaces/metadata/xsd/core/2" xmlns:ns3="http://www.cablelabs.com/namespaces/metadata/xsd/signaling/2">' \
           '{}'.format(''.join(responses)) + \
           '</ns2:ManifestConfirmConditionNotification>'


def start_media_convert(asset):
    location = ""
    asset_type = asset["entityType"]
    if asset_type == "MOVIE":
        location = "movies"
    else:
        location = "episodes"
    contentData = json.loads(asset["contentData"])
    s3UrlMatches = re.match("^https?:\/\/(.+(?=\.s3[.-])).+((?<=\.amazonaws\.com\/).+)$", contentData["asset"]["url"])
    captionSelectorSetting = dict()
    for idx, subtitle in enumerate(contentData["subtitles"]):
        if subtitle["type"] == "text/webvtt":
            captionSelectorSetting["Captions Selector {}".format(idx + 1)] = {
                "SourceSettings": {
                    "SourceType": 'WEBVTT',
                    "FileSourceSettings": {
                        "SourceFile": subtitle["href"],
                    },
                },
            }
        elif subtitle["type"] == "text/srt":
            captionSelectorSetting["Captions Selector {}".format(idx + 1)] = {
                "SourceSettings": {
                    "SourceType": 'SRT',
                    "FileSourceSettings": {
                        "SourceFile": subtitle["href"],
                    },
                },
            }
        elif subtitle["type"] == 'text/vtt':
            captionSelectorSetting["Captions Selector {}".format(idx + 1)] = {
                "SourceSettings": {
                    "SourceType": 'WEBVTT',
                    "FileSourceSettings": {
                        "SourceFile": subtitle["href"],
                    },
                },
            }
        elif subtitle["type"] == "application/x-subrip":
            captionSelectorSetting["Captions Selector {}".format(idx + 1)] = {
                "SourceSettings": {
                    "SourceType": 'SRT',
                    "FileSourceSettings": {
                        "SourceFile": subtitle["href"],
                    },
                },
            }
        else:
            captionSelectorSetting["Captions_Selector_{}".format(idx + 1)]: None

    settings = read_json("./jobTemplate.json")
    settings["Settings"]["Inputs"] = [{**input,
                                       "CaptionSelectors": captionSelectorSetting if len(
                                           captionSelectorSetting.keys()) > 0 else {},
                                       "FileInput": "s3://{}/{}".format(s3UrlMatches[1],
                                                                        s3UrlMatches[2]) if s3UrlMatches else
                                       contentData["asset"]["url"]
                                       } for input in settings["Settings"]["Inputs"]]

    settings["Settings"]["OutputGroups"] = [{**output,
        "OutputGroupSettings": {
            **output["OutputGroupSettings"],
            "HlsGroupSettings": {
                **output["OutputGroupSettings"]["HlsGroupSettings"],
                "Destination": "s3://cms-api-prod-cmsassetsbucket-1anox04n0s08h/{}/{}/vod/".format(location,
                                                                                                   asset["id"])
            },
        }
    } for output in settings["Settings"]["OutputGroups"]]
    print("cuePoints {}".format(contentData["cuePoints"]))
    if len(contentData["cuePoints"]) > 0 and '' not in contentData["cuePoints"]:
        settings["Settings"]["Esam"] = {
            "ResponseSignalPreroll": 0,
            "SignalProcessingNotification": {
                "SccXml": generateScc(contentData["cuePoints"]) if len(
                    contentData["cuePoints"]) > 0 else [],
            },
            "ManifestConfirmConditionNotification": {
                "MccXml": generateMcc(contentData["cuePoints"]) if len(
                    contentData["cuePoints"]) > 0 else []
            },
        }
    print(settings["Settings"]["Inputs"][0]["FileInput"])
    print("start job...")
    result = mediaconvert.create_job(
        AccelerationSettings={
            'Mode': 'DISABLED'
        },
        Queue='arn:aws:mediaconvert:us-east-1:199718138082:queues/vod-queue',
        Role='arn:aws:iam::199718138082:role/cms-api-prod-MediaConvertJobRole-1OJRZXXQCZUNW',
        Tags={
            'map-migrated': 'd-server-03ldkhdk7ade4y'
        },
        UserMetadata={
            "ingestionId": "RETRY1PARENTID",
            "entityId": "{}/{}".format(asset_type.lower(), asset["id"]),
            "media": contentData["asset"]["url"][:256] if len(contentData["asset"]["url"]) > 255 else contentData["asset"]["url"]
        },
        Settings={
            **settings["Settings"]
        })
    print("job started")


def get_episode(id):
    response = table.get_item(
        Key={
            'PK': 'ASSET#EPISODE#{}'.format(id),
            'SK': 'ASSET#EPISODE#{}'.format(id)
        }
    )
    return response["Item"]


def get_movie():
    response = table.query(
        IndexName='GSI4',
        KeyConditionExpression=Key('GSI4-PK').eq('ASSET#MOVIE#CREATED') & Key('GSI4-SK').lt('2023-08-23'),
        Limit=1000
    )
    items = response['Items']
    while response.get('LastEvaluatedKey') is not None:
        response = table.query(
            IndexName='GSI4',
            KeyConditionExpression=Key('GSI4-PK').eq('ASSET#MOVIE#CREATED') & Key('GSI4-SK').lt('2023-08-23'),
            ExclusiveStartKey=response.get('LastEvaluatedKey'),
            Limit=1000
        )
        items.extend(response['Items'])
    return items


iter = 0
jobs = read_json('./submitted_jobs.json')

episodes = get_episodes()
for episode in episodes:
    if len(episode["streams"]) < 1:
        contentData = json.loads(episode["contentData"])
        # print(contentData["asset"])
        if "https://us-originalsourcevideo.s3-us-west-1.amazonaws.com/" in contentData["asset"]['url']:
            if not any(
                    ("entityId" in job['UserMetadata'] and job['UserMetadata']['entityId'].split('/')[1] == episode["id"])
                    for job in jobs["jobs"]):
                print("{}".format(episode["id"]))
                # start_media_convert(episode)
                iter += 1


print(iter)
print(len(episodes))
