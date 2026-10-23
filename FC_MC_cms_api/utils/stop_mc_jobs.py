import json

import boto3

mediaconvert = boto3.client('mediaconvert', region_name='us-east-1',
                            endpoint_url='https://lxlxpswfb.mediaconvert.us-east-1.amazonaws.com')

def read_json(path):
    f = open(path)
    data = json.load(f)
    f.close()
    return data

jobs = read_json('./submitted_jobs.json')

for job in jobs["jobs"]:
    mediaconvert.cancel_job(Id=job["id"])
