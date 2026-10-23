import boto3

PROD_BUCKET = "cms-api-prod-cmsassetsbucket-1anox04n0s08h"

TEST_BUCKET = "cms-api-test-cmsassetsbucket-8r2kjv37ivo0"

BUCKET_NAME = PROD_BUCKET

ITEMS_ID = [
]

ASSETS_TYPE = [
    "channels",
    "default",
    "epg",
    "episodes",
    "movies",
    "npvr",
    "packages",
    "series",
]

s3 = boto3.resource('s3')
api_prod_bucket = s3.Bucket(BUCKET_NAME)

for asset_type in ASSETS_TYPE:
    for item_id in ITEMS_ID:
        for obj in api_prod_bucket.objects.filter(Prefix=asset_type + "/" + item_id):
            print(obj.key)
            obj.delete()
