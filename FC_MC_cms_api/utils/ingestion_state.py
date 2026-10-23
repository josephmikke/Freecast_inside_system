from pprint import pprint
import requests
import json

PROD_API_KEY = "KhklU80VoBaUuVlszcpXa831W84lRfcb2KUwlwz6"

BASE_URL = "https://d1ja1lkih15vd5.cloudfront.net/prod/vod/ingestions"


def get_ingestions() -> list:
    response = {}
    ingestions = []
    header = {"x-api-key": PROD_API_KEY}
    response = requests.get(BASE_URL, params={"limit": "300"}, headers=header).json()
    ingestions.extend(response["ingestions"])
    while response.get("nextToken") is not None:
        response = requests.get(BASE_URL, headers=header,
                                params={"nextToken": response.get("nextToken"), "limit": "300"}).json()
        ingestions.extend(response["ingestions"])
    return ingestions


def is_error_in_page(ingestion):
    if ingestion["status"] == "COMPLETED":
        return None
    if ingestion["status"] == "FAILED":
        # return ingestion["id"]
        return "\tpage {} failed\n\tpage url: {}\n\tjobs: {}\n\tsaved: {}\n--------------" \
            .format(ingestion["id"], ingestion["extId"],
                    json.dumps(
                        ingestion.get("jobs", "{}"),
                        indent=2),
                    json.dumps(
                        ingestion.get("saved", "{}"),
                        indent=2))
    if not ingestion["jobs"] and ingestion["status"] == "IN_PROGRESS":
        # return ingestion["id"]
        return "\tpage {} is stuck\n\tpage url: {}\n\tjobs: {}\n\tsaved: {}\n--------------" \
            .format(ingestion["id"],
                    ingestion["extId"],
                    json.dumps(
                        ingestion.get(
                            "jobs",
                            "{}"),
                        indent=2),
                    json.dumps(
                        ingestion.get(
                            "saved",
                            "{}"),
                        indent=2))
    return None


pages = get_ingestions()
ingestions = {}

for page in pages:
    id = page["parentId"]
    if (ingestions.get(id) == None):
        ingestions[id] = []
    ingestions[id].append(page)

for parentID in ingestions.keys():
    error = False
    for ingestion in ingestions[parentID]:
        error_message = is_error_in_page(ingestion)
        if error_message:
            if error == False:
                print("errors in ingestion {}: ".format(parentID))
                error = True
            print(error_message)
