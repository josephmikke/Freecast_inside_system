import logging
import xml.etree.ElementTree as ET
import datetime
import uuid
import urllib3
import os, sys, traceback
import boto3
from base64 import b64encode, b64decode
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
SSM_PVK_PARAMETER = os.environ.get("PRIVATE_KEY_SSM_NAME", "")
SSM_PVK_NAME_PARAMETER = os.environ.get("PRIVATE_KEY_ID_SSM_NAME", "")

_logger = logging.getLogger()
_logger.setLevel(LOG_LEVEL)

def log_exception():
    """ Log exception with trace
    """

    exc_type, exc_value, exc_traceback = sys.exc_info()
    _logger.error("".join(traceback.format_exception(exc_type, exc_value, exc_traceback)))

def get_pvk():
    """ Request private key from the AWS Parameter Store

    Returns:
        str: private key
    """

    ssm = boto3.client("secretsmanager")
    token = ssm.get_secret_value(SecretId=SSM_PVK_PARAMETER)
    return token["SecretString"]
    
def get_pvk_name():
    """ Request private key name from the AWS Parameter Store

    Returns:
        str: private key name
    """

    ssm = boto3.client("secretsmanager")
    token = ssm.get_secret_value(SecretId=SSM_PVK_NAME_PARAMETER)
    return token["SecretString"]

def respond(data, status, isBase64Encoded):
    """ Prepare response to the API Gateway

    Args:
        data (str): Data to return
        status (int): Integer representation of HTTP Status Code
        isBase64Encoded (bool): Defines whether the Data is base64-encoded or no so the API
                                Gateway would correctly represent it to the client.

    Returns:
        dict: Response
    """

    response = {
        "statusCode": status,
        "body": data,
        "isBase64Encoded": isBase64Encoded,
        'headers': {
            'Content-Type': 'application/octet-stream',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
        }
    }

    return response

def init_auth_xml():
    """ Creates Authentication XMLs required fields set

    Returns:
        Element: Authentication XML"s Data element
    """

    pvk_name = None
    try:
        pvk_name = get_pvk_name()
    except Exception as e:
        _logger.error(f"Error getting the pvk name. {e}")

    data_el = ET.Element("Data")

    # Generation time of the authentication XML.
    generation_time = datetime.datetime.utcnow()
    expiration_time = generation_time + datetime.timedelta(minutes = 2)

    # The format of the date should be the following: YYYY-MM-DD HH:mm:ss.SSS
    ET.SubElement(data_el, "GenerationTime").text = generation_time.strftime("%Y-%m-%d %H:%M:%S.%f")[0:23]
    ET.SubElement(data_el, "ExpirationTime").text = expiration_time.strftime("%Y-%m-%d %H:%M:%S.%f")[0:23]

    # Make sure that every authentication XML is unique.
    ET.SubElement(data_el, "UniqueId").text = str(uuid.uuid4())

    # The name of your PEM file.
    ET.SubElement(data_el, "RSAPubKeyId").text = pvk_name

    return data_el

def finalize_auth_xml(data_el):
    """ Signs and base64-encodes final Authentication XML

    Args:
        data_el (Element): Authentication XML's Data element

    Returns:
        str: base64-encoded Authentication XML
    """
    
    pvk = None
    try:
        pvk = get_pvk()
    except Exception as e:
        _logger.error(f"Error getting the wv cwip token. {e}")

    # Import key and create a signer.
    private_key = serialization.load_pem_private_key(str.encode(pvk), password=None, backend=default_backend())

    signature = b64encode(private_key.sign(ET.tostring(data_el), padding.PKCS1v15(), hashes.SHA1()))

    root_el = ET.Element("KeyOSAuthenticationXML")
    root_el.append(data_el)

    # Add signature to the root element.
    ET.SubElement(root_el, "Signature").text = signature.decode()

    # Print out the authentication XML.
    print(ET.tostring(root_el))
    return b64encode(ET.tostring(root_el)).decode("utf-8")

def get_full_auth_xml():
    """ Generates the authentication XML with license policies in it.

    Returns:
        str: base64-encoded Authentication XML
    """

    data_el = init_auth_xml();

    # Add Widevine license related policies.
    wv_content_policy = ET.SubElement(data_el, "WidevinePolicy", { "fl_CanPlay": "true", "fl_CanPersist": "false" })
    wv_content_key_spec_el = ET.SubElement(data_el, "WidevineContentKeySpec", { "TrackType": "HD" })
    ET.SubElement(wv_content_key_spec_el, "SecurityLevel").text = "1"

    # Add PlayReady license related policies.
    ET.SubElement(data_el, "License", { "type": "simple" })

    # Add FairPlay license policies.
    ET.SubElement(data_el, "FairPlayPolicy ")

    return finalize_auth_xml(data_el)

def get_minimum_auth_xml():
    """ Generates minimum required Authentication XML which is. Only required to get the widevine server certificate.
        No need to set any specific license policies.

    Returns:
        str: base64-encoded Authentication XML
    """

    data_el = init_auth_xml();

    # Add Widevine license related policies.
    ET.SubElement(data_el, "WidevinePolicy", { "fl_CanPlay": "true", "fl_CanPersist": "false" })
    wv_content_key_spec_el = ET.SubElement(data_el, "WidevineContentKeySpec", { "TrackType": "HD" })
    ET.SubElement(wv_content_key_spec_el, "SecurityLevel").text = "1"

    return finalize_auth_xml(data_el)

def process_license_request(event, context):
    # Get the license challenge
    payload = event["body"]

    # If the license challenge is base64-encoded, decode it into binary
    if event["isBase64Encoded"] == True:
        payload = b64decode(payload)

    if not payload:
        raise Exception("Can't read the license challenge.")

    # Get the type of the DRM to get the license for
    if "drm-type" not in event["queryStringParameters"]:
        raise Exception("'drm-type' query param not set.")

    drm_type = event["queryStringParameters"]["drm-type"].lower()

    headers = {}
    la_url = ""
    if drm_type == "widevine":
        headers.update({ "Content-Type": "application/octet-stream" })
        la_url = "https://widevine.keyos.com/api/v4/getLicense"
    elif drm_type == "playready":
        headers.update({ "Content-Type": "text/xml; charset=utf-8" })
        la_url = "https://playready.keyos.com/api/v4/getLicense"
    elif drm_type == "fairplay":
        headers.update({ "Content-Type": "text/plain; charset=utf-8" })
        la_url = "https://fairplay.keyos.com/api/v4/getLicense"

    if not la_url:
        raise Exception("Can't determine the license acquisition URL.")

    
    
    # Possible place where to put your authentication/authorization logic and
    # decide whether to return an error, or move forward and make certificate and/or
    # license requests to KeyOS APIs.
    #

    
    # Prepare to do some HTTP requests.
    http = urllib3.PoolManager()

    # The SERVICE_CERTIFICATE_REQUEST is a 2 byte payload in the license acquisition request: 0x0804 (CAQ=).
    if drm_type == "widevine" and payload == b"\x08\x04":
        # Generate minimum required authentication XML to get the certificate.authentication XML.
        # One may also generate a minimum required authentication XML with long expiration time
        # and re-use it over and over again w/o generating a fresh one every time. It will save
        # computational resources for this specifc case.
        headers.update({ "x-keyos-authorization": get_minimum_auth_xml()})
        print("widevine")
        print(get_minimum_auth_xml())

        # Try and get the server certificate.
        cert = http.request("POST", la_url, body=payload, headers=headers)
        return respond(b64encode(cert.data), cert.status, True)

    # Generate full authentication XML which will contain license policies based
    # on your knowledge about the user who requests the content and the content itself.
    headers.update({ "x-keyos-authorization": get_full_auth_xml()})
    print("other DRM type")
    print(get_full_auth_xml())

    # Request after the playready license requires specific header.
    if drm_type == "playready":
        headers.update({ "soapaction": "http://schemas.microsoft.com/DRM/2007/03/protocols/AcquireLicense"})

    # Try requesting a license.
    lic = http.request("POST", la_url, body=payload, headers=headers)
    return respond(b64encode(lic.data), lic.status, True)

def lambda_handler(event, context):
    try:
        return process_license_request(event, context)
    except Exception as e:
        log_exception()