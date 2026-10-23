from lxml import etree, html
import requests
import boto3
import json

ns = {'media': 'http://search.yahoo.com/mrss/'}
atom = {'atom': 'http://www.w3.org/2005/Atom'}
xumo = {'xumo': 'http://www.xumo.com/rss/extensions/'}

arr = []
# dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
# s3 = boto3.client('s3', region_name='us-east-1')
# table = dynamodb.Table('cms-prod')

def parse_xml(url):
    res = requests.get(url)
    root = etree.fromstring(res.content)
    nextPage = root.find("./channel/atom:link[@rel='next']", atom)
    for item in root.findall('channel/item/series'):
        guid = item.find('guid')
        title = item.find('title')
        arr.append({
            "title": title.text,
            "guid": guid.text,
        })
        # type = item.find('xumo:episodic', xumo)
        # if type is None:
        #     continue
        # if type.attrib["type"] == "series":
        #     guid = item.find('guid')
        #     title = item.find('title')
        #     arr.append({
        #         "title": title.text,
        #         "guid": guid.text,
        #     })
            # table.delete_item(
            #     Key={
            #         'PK': 'ASSET#EPISODE#{}'.format(guid.text),
            #         'SK': 'ASSET#EPISODE#{}'.format(guid.text)
            #     }
            # )
        # thumbnails = item.findall('media:group/media:thumbnail', ns)
        # if guid is None:
        #     continue
        # if guid.text not in guids:
        #     continue
        # # print("guid found: {}".format(guid.text))
        # thumbnail_list = []
        # for key, thumb in enumerate(thumbnails):
        #     # print(thumb.attrib)
        #     thumbnail_list.append({
        #         "height": thumb.attrib["height"],
        #         "url": thumb.attrib["url"],
        #         "width": thumb.attrib["width"]
        #     })
    if nextPage is not None:
        # print(nextPage.attrib['href'])
        return parse_xml(nextPage.attrib['href'])

parse_xml("https://syndication.crackle.com/feeds/vod/offnetworkvod_crackle_121.mrss")
with open('popcorn-series-guid.json', 'w') as f:
    json.dump(arr, f)
