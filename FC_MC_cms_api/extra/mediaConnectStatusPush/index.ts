import {
  BatchUpdateScheduleCommand,
  DescribeChannelCommand,
  DescribeInputCommand,
  MediaLiveClient,
} from '@aws-sdk/client-medialive';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const sns = new SNSClient({});
const medialive = new MediaLiveClient({});
const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE_NAME = process.env.TABLE_NAME; // "cms-log"
const EVENT_SORT_KEY = 'EVENT';
const SNS_EVENT_SORT_KEY = 'SNSEvent';

const delaySecondsStr = process.env.DEBOUNCE_DELAY_SECONDS || '0'; // "180"
const delaySeconds = parseInt(delaySecondsStr, 10); // 5
const delayMs = Number(delaySecondsStr) * 1000; // 5000

const flows = [
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-XFpWVVYPBQVeWQoC-a48a3615e838:Caregivers-TV-Multiplex',
    flow_name: 'Caregivers-TV-Multiplex',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-XltaVgRfAgkNUFwP-c54baf6961e5:Pursuit-Mediaconnect',
    flow_name: 'Pursuit',
    channel_id: '9955890',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-DAVbAAEOXgxdVApS-32b74d78e3f1:Weathernation_Primary',
    flow_name: 'Weathernation',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-DQ8EWglUB15fWA9c-04379d237818:weathernation_backup',
    flow_name: 'Weathernation-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-WFpTVQEHUQJXUgBe-cfd2187d4b5d:amagi_Value_curiosity',
    flow_name: 'Amagi',
    channel_id: '2864725',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-AAkEVV8HVVcPXllS-112187d4e0a5:comcast_Value_UP_TV_backup',
    flow_name: 'UP_TV-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-Xg0OB1cJBwRdW1kB-bc917c33b50e:comcast_Value_UP_TV_clone',
    flow_name: 'UP_TV',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-WFwGD1IMAVIPV1FR-d2192f5e0985:freecast-LTN-PFC-Multiplex',
    flow_name: 'PFC-Multiplex',
    channel_id: '5979856',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-CF8EUldfAQYNWVpd-413d75512739:nextologies_GET_TV_backup',
    flow_name: 'Nextologies_GET_TV-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-UgwDXVNTAVEJXlxV-c4594c02c0d2:nextologies_INSP_backup',
    flow_name: 'Nextologies_INSP-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-WAsGBlFTAQILCl5d-de1019554d79:nextologies_Outdoor_backup',
    flow_name: 'Nextologies_Outdoor-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-CF4CXFQGBVtTCwtX-9f4836489e30:nextologies_Reelz_backup',
    flow_name: 'Nextologies_Reelz-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-AVpSVlMIUFRTDFtW-0bd248a79bc1:nextologies_Sony_backup',
    flow_name: 'Nextologies_Sony-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-AQtTU1UDVQEPD1pe-03e723dbeab9:nextologies_Sports_HD_backup',
    flow_name: 'Nextologies_Sports_HD-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-WwpaUQZcAlZeV1gL-fd4ece6fe6a1:nextologies_Value_AXS_TV',
    flow_name: 'Nextologies_AXS_TV-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-WA8OWgNWAAhbAwdX-e4973f5e3c93:nextologies_Value_GSN',
    flow_name: 'Nextologies_GSN-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-Dl5TXFUAAF8KVQxc-3ed1e052b528:nextologies_Value_HDNET',
    flow_name: 'Nextologies_HDNET-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-AF5VVFEHUwAPWw8E-1fc067bce57c:nextologies_Value_WFN',
    flow_name: 'Nextologies_WFN-Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-DggMDVZYBlIMUQsI-3fb93a2b7022:vubiquity_Value_AXS_TV',
    flow_name: 'AXS_TV',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-UgwPAgIBUFFdV1xQ-c49fe1a279d7:nextologies_babyfirst_tv',
    flow_name: 'BabyFirst_TV',
    channel_id: '1528548',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-WVYBAFcMBwVZWFtV-e8667f32f621:vubiquity_Value_FETV',
    flow_name: 'FETV',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-CgpXAgALBlILVw5f-7d96e22b067e:vubiquity_Value_FETV_Backup',
    flow_name: 'FETV_Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-CFNYUQBcXw0AVlQB-7daf5669818b:vubiquity_Value_Family_Movie_Classics',
    flow_name: 'FMC',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-VQgHUgVVCAVbX1tR-d016be9f11c6:vubiquity_Value_Family_Movie_Classics_backup',
    flow_name: 'FMC_Backup',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-XwgKA1EBAwhYWQEO-bfd74878c884:vubiquity_Value_GSN',
    flow_name: 'GSN',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-C18IAFUABgRaVwsC-61f40924a628:vubiquity_Value_Get_TV',
    flow_name: 'Get_TV',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-BF8PBlILDFYOBwgM-91a2728f5f16:vubiquity_Value_HDNET',
    flow_name: 'HDNET',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-WQ8EBwVYDFYGDA1T-ea31e28a9bd7:vubiquity_Value_INSP',
    flow_name: 'INSP',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-DFgGVFELBFEOWQ1X-061b1a0f17d3:vubiquity_Value_Outdoor_Channel_HD',
    flow_name: 'Outdoor',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-CANcDldSUFABBl8A-74e9b89d9a3c:vubiquity_Value_Reelz',
    flow_name: 'Reelz',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-CV0PVQYJAFNUUgcM-2a8266f57b26:vubiquity_Value_SONYMOVIES',
    flow_name: 'SonyMovies',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-X1sDBFVeVQIJDAhc-c54254a56ba8:vubiquity_Value_Sportsman_Channel_HD',
    flow_name: 'SportsMan',
  },
  {
    arn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-CllUAVBZUVFaWgxQ-67c703efe4e4:vubiquity_Value_World_Fishing_Network',
    flow_name: 'WFN',
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeEventToDynamoDB = async (flowArn: string, state: string | undefined, eventTime: string | undefined) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: flowArn, 
      SK: EVENT_SORT_KEY,
    },
    UpdateExpression:
      'SET #status = :status, #eventTime = :eventTime, #updatedAt = :updatedAt, #flowArn = :flowArn, #flowName = :flowName, #entityType = :entityType',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#eventTime': 'event-time',
      '#updatedAt': 'updatedAt',
      '#flowArn': 'flow-arn',
      '#flowName': 'flow-name',
      '#entityType': 'entityType',
    },
    ExpressionAttributeValues: {
      ':status': state,
      ':eventTime': eventTime,
      ':updatedAt': new Date().toISOString(),
      ':flowArn': flowArn,
      ':flowName': flows.find((f) => f.arn === flowArn)?.flow_name || 'Unknown',
      ':entityType': 'MediaConnectFlowEvent',
    },
    ReturnValues: 'ALL_NEW' as const, // optional: return updated item
  };

  try {
    const result = await dynamoDB.send(new UpdateCommand(params));
    console.log(' DynamoDB item updated/created:', result.Attributes);
  } catch (err) {
    console.error(' Error updating DynamoDB item:', err);
    throw err;
  }
};

// Read latest event from DynamoDB
const getLatestEventFromDynamoDB = async (flowArn: string) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: flowArn,
      SK: EVENT_SORT_KEY,
    },
  };
  const result = await dynamoDB.send(new GetCommand(params));
  return result.Item;
};

const writeSNSEventToDynamoDB = async (flowArn: string, state: string, eventTime: string | undefined) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `SNS-${flowArn}`,
      SK: SNS_EVENT_SORT_KEY,
    },
    UpdateExpression:
      'SET #status = :status, #eventTime = :eventTime, #updatedAt = :updatedAt, #flowArn = :flowArn, #flowName = :flowName, #entityType = :entityType',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#eventTime': 'event-time',
      '#updatedAt': 'updatedAt',
      '#flowArn': 'flow-arn',
      '#flowName': 'flow-name',
      '#entityType': 'entityType',
    },
    ExpressionAttributeValues: {
      ':status': state,
      ':eventTime': eventTime,
      ':updatedAt': new Date().toISOString(),
      ':flowArn': flowArn,
      ':flowName': flows.find((f) => f.arn === flowArn)?.flow_name || 'Unknown',
      ':entityType': 'SNSEvent',
    },
    ReturnValues: 'ALL_NEW' as const,
  };

  try {
    const result = await dynamoDB.send(new UpdateCommand(params));
    console.log(' DynamoDB SNS item updated/created:', result.Attributes);
  } catch (err) {
    console.error(' Error updating DynamoDB SNS item:', err);
    throw err;
  }
};

const getSNSEventFromDynamoDB = async (flowArn: string) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `SNS-${flowArn}`,
      SK: SNS_EVENT_SORT_KEY,
    },
  };
  const result = await dynamoDB.send(new GetCommand(params));
  return result.Item;
};

export const handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const disconnected_flow = flows.filter(
    (flow) => event?.resources?.indexOf(flow.arn) >= 0
  );

  if (disconnected_flow.length === 0) {
    console.log('No relevant flows found.');
    return { statusCode: 200, body: 'No relevant flows' };
  }

  const flow = disconnected_flow[0];
  const flowArn = flow.arn;
  const originalState = event.detail.current.state;
  const eventTime = event.time; // ISO string from EventBridge
  const previousEvent = await getLatestEventFromDynamoDB(flowArn);
  // ✅ STEP 1: Write this event to DynamoDB
  await writeEventToDynamoDB(flowArn, originalState, eventTime);

  // ✅ STEP 2: Wait 3 mins
  await delay(delayMs);

  // ✅ STEP 3: Read latest state from DynamoDB
  const latestEvent = await getLatestEventFromDynamoDB(flowArn);

  if (!latestEvent) {
    console.log(`No event found in DynamoDB for ${flowArn} after 3mins.`);
    return { statusCode: 200, body: 'No event in DB' };
  }

  const currentStateInDB = latestEvent.status;
  //  CASE 1: DISCONNECTED event
  console.log(`originalState: ${originalState}, previousEvent?.status: ${previousEvent?.status}, currentStateInDB: currentStateInDB`);
  if (originalState === 'DISCONNECTED') {
    //Ignore case
    if (previousEvent?.status === "CONNECTED" && currentStateInDB === "CONNECTED") {
      console.log(
        ` Flow ${flow.flow_name} was previously disconnected. But now it's connected. Ignoring alert.`
      );
      return {
        statusCode: 200,
        body: `Previously disconnected. Ignoring`,
      };
    }

    // Send SNS
    const snsParams = {
      Message: `
            ${flow.flow_name} ${originalState} .
            Time: ${eventTime}`,
      Subject: `Mediaconnect Flow ${originalState} `,
      TopicArn: 'arn:aws:sns:us-east-1:199718138082:MediaConnect-Disconnected',
    };

    try {
      const data = await sns.send(new PublishCommand(snsParams));
      console.log('SNS publish response:', data);
      await writeSNSEventToDynamoDB(flowArn, originalState, new Date().toISOString());
    } catch (err) {
      console.error('Error publishing to SNS:', err);
    }

    // Special notification for Multiplex
    if (flow.flow_name.indexOf('Multiplex') >= 0) {
      const multiplexParams = {
        Message: `
            ${flow.flow_name} ${originalState}.
            Time: ${eventTime}`,
        Subject: `Mediaconnect Flow ${originalState}`,
        TopicArn:
          'arn:aws:sns:us-east-1:199718138082:LTN-Channels-Notification',
      };

      try {
        const data = await sns.send(new PublishCommand(multiplexParams));
        console.log('SNS publish response (Multiplex):', data);
      } catch (err) {
        console.error('Error publishing to SNS (Multiplex):', err);
      }
    }
  }

  //  CASE 2: CONNECTED event
  else if (originalState === 'CONNECTED') {
    

    const snsEventRecord = await getSNSEventFromDynamoDB(flowArn);
    console.log('SNSEventTime: ', snsEventRecord?.['event-time'], 'SNSEvent Status: ', snsEventRecord?.status);
    const disconnectTimeMs = new Date(previousEvent?.['event-time']).getTime();
    const connectEventTimeMs = new Date(eventTime).getTime();
    const snsPendingDisconnect =
      snsEventRecord?.status === 'DISCONNECTED' &&
      disconnectTimeMs !== null &&
      connectEventTimeMs !== null &&
      connectEventTimeMs >= disconnectTimeMs;
    
    if (!snsPendingDisconnect) {
      console.log(
        ` Flow ${flow.flow_name}: skip restore SNS — no pending DISCONNECTED SNS row or connect event time before stored SNS event time.`
      );
      return {
        statusCode: 200,
        body: 'Restore SNS skipped (SNS state / event-time)',
      };
    }
    if (snsEventRecord?.status === "DISCONNECTED" && connectEventTimeMs - disconnectTimeMs <= delayMs) {
      console.log(
        ` Flow ${flow.flow_name} was previously disconnected. But now it's connected shortly. Ignoring alert.`
      );
      return { statusCode: 200, body: "Already connected" };
    }
    console.log(
      ` Flow ${flow.flow_name} stably connected. Sending restore alert.`
    );
    const snsParams = {
      Message: `
            ${flow.flow_name} ${originalState} .
            Time: ${eventTime}`,
      Subject: `Mediaconnect Flow ${originalState} `,
      TopicArn: 'arn:aws:sns:us-east-1:199718138082:MediaConnect-Disconnected',
    };

    try {
      const data = await sns.send(new PublishCommand(snsParams));
      console.log('SNS publish response:', data);
      await writeSNSEventToDynamoDB(flowArn, originalState, new Date().toISOString());
    } catch (err) {
      console.error('Error publishing to SNS:', err);
    }

    if (flow.flow_name.indexOf('Multiplex') >= 0) {
      const multiplexParams = {
        Message: `
            ${flow.flow_name} ${originalState}.
            Time: ${eventTime}`,
        Subject: `Mediaconnect Flow ${originalState}`,
        TopicArn:
          'arn:aws:sns:us-east-1:199718138082:LTN-Channels-Notification',
      };

      try {
        const data = await sns.send(new PublishCommand(multiplexParams));
        console.log('SNS publish response (Multiplex):', data);
      } catch (err) {
        console.error('Error publishing to SNS (Multiplex):', err);
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify('Event processed') };
};
