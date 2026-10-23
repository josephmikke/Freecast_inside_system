import boto3
import json
from datetime import datetime
from pprint import pprint
from os import path

mediaconvert = boto3.client('mediaconvert', region_name='us-east-1', endpoint_url='https://lxlxpswfb.mediaconvert.us-east-1.amazonaws.com')
dirname = path.dirname(__file__)

def save_jobs():
    jobs = []
    i = 0
    response = {}
    while True:
        if response == {}:
            response = mediaconvert.list_jobs(
                Queue='vod-queue',
                Status='SUBMITTED',
                Order='DESCENDING',
            )
        else:
            response = mediaconvert.list_jobs(
                Queue='vod-queue',
                NextToken=response.get("NextToken"),
                Status='SUBMITTED',
                Order='DESCENDING',
            )
        i = i + 1
        jobs.extend(response.get("Jobs"))
        print(len(jobs))
        # if len(jobs) > 50:
        #     break
        if response.get("NextToken") is None:
            break
    object = {
        "jobs": [
            {
                "id": job["Id"],
                "Status": job["Status"],
                "UserMetadata": job["UserMetadata"],
            } for job in jobs
        ]
    }
    # print(object)

    with open('submitted_jobs.json', 'w') as outfile:
        json.dump(object, outfile, indent=4, sort_keys=True, default=str)
    # jobs = json.load(open(path.join(dirname, 'mediaconvert_jobs.json'), 'r'))["jobs"]
    # return jobs

def get_jobs():
    print("fetching jobs backup...")
    jobs = json.load(open(path.join(dirname, 'mediaconvert_jobs.json'), 'r'))["jobs"]
    return jobs

def delete_job(job_id):
    mediaconvert.cancel_job(
        Id=job_id,
    )

if __name__ == "__main__":
    save_jobs()