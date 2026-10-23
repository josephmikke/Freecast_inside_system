import React from 'react';
import moment from 'moment/moment';
import LogRow from '@components/user/LogRow';

const logs = [
  { text: 'Current user changed the logo image of REELZ on Content > Channels.', date: moment().subtract(Math.random() * 100, 'minutes') },
  { text: 'Current user changed the logo image of Crackle on Configurations > Providers.', date: moment().subtract(Math.random() * 100, 'minutes') },
  { text: 'Current user changed the user permissions for UserName on Admin > Users.', date: moment().subtract(Math.random() * 100, 'minutes') },
  { text: 'Current user changed the image for GeoIP Rules on Admin < Menu Items', date: moment().subtract(Math.random() * 100, 'minutes') },
  { text: 'Current user changed the user permissions for UserName on Admin > Users.', date: moment().subtract(Math.random() * 100, 'minutes') },
  { text: 'Current user changed the logo image of Crackle on Configurations > Providers.', date: moment().subtract(Math.random() * 100, 'minutes') },
];

export default function ActivityLog() {
  return (
    <div className="p-4 bg-gray w-[600px]  rounded-xl">
      <h2 className="text-2xl ">Activity Log</h2>
      <div className="flex mt-3 flex-row w-full justify-center">
        <div className="w-[100%] bg-white h-[1px]" />
      </div>

      <div className="max-h-[400px] overflow-y-scroll">
        <div className="mt-3">
          <span>Today</span>
        </div>
        <div className="mt-3">
          {logs.map((log, index) => (
            <LogRow key={`${log.text}${String(index)}`} text={log.text} date={log.date} />
          ))}
        </div>
      </div>
    </div>
  );
}
