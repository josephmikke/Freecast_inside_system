import json
import boto3
from botocore.config import Config

my_config = Config(
    region_name='us-east-1',
)

client = boto3.client('lambda', config=my_config)
mediapackage = boto3.client('mediapackage-vod', region_name='us-east-1')


def read_json(path):
    f = open(path)
    data = json.load(f)
    f.close()
    return data


# jobs = read_json("./out.json")

# for job in jobs["jobs"]:
#     s3_location = job["UserMetadata"]["media"].split("/")
#     s3_location = s3_location[len(s3_location) - 1].split(".")[0]
#     print({
#         "version": "0",
#         "detail-type": "MediaConvert Job State Change",
#         "region": "us-east-1",
#         "resources": [
#             "arn:aws:mediaconvert:us-east-1:199718138082:jobs/1695684259869-bjadfj"
#         ],
#         "detail": {
#             "accountId": "199718138082",
#             "queue": "arn:aws:mediaconvert:us-east-1:199718138082:queues/vod-queue",
#             "jobId": "{}".format(job["id"]),
#             "status": "COMPLETE",
#             "userMetadata": {
#                 "ingestionId": "{}".format(job["UserMetadata"]["ingestionId"]),
#                 "entityId": "{}".format(job["UserMetadata"]["entityId"],),
#                 "media": "{}".format(job["UserMetadata"]["media"]),
#                 "ingestionUrl": "{}".format(job["UserMetadata"]["ingestionUrl"])
#             },
#             "outputGroupDetails": [
#                 {
#                     "playlistFilePaths": [
#                         "s3://cms-api-prod-cmsassetsbucket-1anox04n0s08h/{}/vod/{}.m3u8".format(job["UserMetadata"]["entityId"], s3_location)
#                     ],
#                     "type": "HLS_GROUP"
#                 }
#             ]
#         }
#     })

def read_json(path):
    f = open(path)
    data = json.load(f)
    f.close()
    return data

# get all MediaPackage items
jobs = read_json('./filtered_assets.json') # get_items()

def describe_asset(id):
    return mediapackage.describe_asset(
        Id=id
    )

for job in jobs:
    print("describe asset")
    asset = describe_asset(job["Id"])
    for endpoint in asset["EgressEndpoints"]:
        payload = {
            "version": "0",
            "id": "11dfe1d8-8fcc-33e1-200a-35b94f199430",
            "detail-type": "MediaPackage Input Notification",
            "source": "aws.mediapackage",
            "account": "199718138082",
            "time": "2023-09-28T23:28:43Z",
            "region": "us-east-1",
            "resources": [
                "arn:aws:mediapackage-vod:us-east-1:199718138082:assets/{}".format(job["Id"]),
                "arn:aws:mediapackage-vod:us-east-1:199718138082:packaging-configurations/{}".format(endpoint["PackagingConfigurationId"])
            ],
            "detail": {
                "event": "VodAssetPlayable",
                "message": "Asset {} is now playable for PackagingConfiguration {}".format(job["Id"], endpoint["PackagingConfigurationId"]),
                "packaging_configuration_id": endpoint["PackagingConfigurationId"],
                "manifest_urls": [
                    endpoint["Url"]
                ]
            }
        }
        response = client.invoke(
            FunctionName='cms-api-prod-handleAssetCreationVod',
            InvocationType='Event',
            Payload=json.dumps(payload),
        )
        print(response)
