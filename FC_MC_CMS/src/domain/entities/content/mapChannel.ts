import moment from 'moment/moment';
import { StreamsFormatValues, StreamTypesValues } from '@entities/content/stream';
import { ChannelResult } from '@entities/content/channel';
import getLabel from '@utils/getLabel';

function getSchedule(cron: string): any {
  const values = {
    minutes: cron.split(' ')[0],
    hours: cron.split(' ')[1],
    daysOfMonth: cron.split(' ')[2],
    months: cron.split(' ')[3],
    daysOfWeek: cron.split(' ')[4],
    year: cron.split(' ')[5],
  };

  if (values.daysOfWeek !== '*' && values.daysOfWeek !== '?') {
    return {
      type: 'WEEKLY',
      weeklyDays: values.daysOfWeek.split(','),
      weeklyHour: `${values.hours}:${values.minutes}`,
    };
  }

  if (values.hours.includes('/') && values.minutes === '0') {
    return {
      type: 'HOURLY',
      hourlyHour: values.hours.split('/')[1],
    };
  }

  return {
    type: 'DAILY',
    dailyHour: `${values.hours}:${values.minutes}`,
  };
}

export function mapChannelToItem(channelItem: any) {
  return {
    ...channelItem,
    rating: {
      value: channelItem.rating,
      label: channelItem.rating,
    },
    packages: channelItem.packages.map((pkg: any) => ({
      label: pkg.name,
      value: pkg.id,
    })),
    categories: channelItem.categories.map((cat: any) => ({
      label: cat.name,
      value: cat.id,
      weight: cat.weight,
    })),
    // eslint-disable-next-line max-len
    distributors: channelItem.distributors.map((dist: any) => ({
      label: dist.name,
      value: dist.id,
    })),
    locations: channelItem.locations.map((loc: any) => ({
      label: loc.name,
      value: loc.id,
    })),
    genres: channelItem.genres.map((genre: any) => ({
      label: genre.name,
      value: genre.id,
    })),
    // eslint-disable-next-line max-len
    brands: channelItem.brands.map((brand: any) => ({
      label: brand.name,
      value: brand.siteId,
    })),
    provider: {
      label: channelItem.provider.name,
      value: channelItem.provider.id,
    },
    platforms: channelItem.platforms.map((platform: any) => ({
      label: platform.name,
      value: platform.id,
    })),
    streams: channelItem.streams.map((stream: any) => ({
      ...stream,
      format: {
        value: stream.format,
        label: getLabel(stream.format, StreamsFormatValues),
      },
      type: {
        value: stream.type,
        label: getLabel(stream.type, StreamTypesValues),
      },
    })),
    epg: channelItem.epg ? {
      ...channelItem.epg,
      epgTemplate: {
        label: channelItem.epg.epgTemplate.name,
        value: channelItem.epg.epgTemplate.id,
      },
      timezone: {
        label: channelItem.epg.timezone,
        value: channelItem.epg.timezone,
      },
      schedule: getSchedule(channelItem.epg.ingestionSchedule),
      programs: channelItem.epg.programs.map((program: any) => ({
        ...program,
        start_date: moment.utc(program.start_time)
          .format(('yyyy-MM-DD')),
        end_date: moment.utc(program.start_time)
          .format(('yyyy-MM-DD')),
        start_time: moment.utc(program.start_time)
          .format(('HH:mm')),
        end_time: moment.utc(program.end_time)
          .format(('HH:mm')),
        duration: moment.utc(moment.duration(program.duration, 'seconds')
          .asMilliseconds())
          .format('hh:mm:ss'),
        rating: program.rating ? {
          value: program.rating,
          label: program.rating,
        } : null,
      })),
    } : undefined,
    availableDate: moment(new Date(channelItem.availableDate))
      .format(('yyyy-MM-DD')),
    expirationDate: channelItem.expirationDate ? moment(new Date(channelItem.expirationDate))
      .format(('yyyy-MM-DD')) : null,
  };
}

export function mapChannelsToItems(channels: any[]) {
  return channels.map((channel: ChannelResult) => ({
    ...channel,
    rating: {
      value: channel.rating,
      label: channel.rating,
    },
    packages: channel.packages.map((pkg) => ({
      label: pkg.name,
      value: pkg.id,
    })),
    categories: channel.categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
      weight: cat.weight,
    })),
    provider: {
      label: channel.provider.name,
      value: channel.provider.id,
    },
    platforms: channel.platforms.map((platform) => ({
      label: platform.name,
      value: platform.id,
    })),
    availableDate: moment(new Date(channel.availableDate))
      .format(('yyyy-MM-DD')),
    expirationDate: channel.expirationDate ? moment(new Date(channel.expirationDate))
      .format(('yyyy-MM-DD')) : null,
  }));
}
