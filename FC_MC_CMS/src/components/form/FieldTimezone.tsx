import React from 'react';
import tc from 'countries-and-timezones';
import { Control } from 'react-hook-form';
import { FieldSelect } from '@components/form/index';

interface FieldTimezoneProps {
  label: string,
  name: string,
  errors: any,
  control: Control<any>;
  errorName?: string,
  isLight?: boolean,
}

function getFormatTimezones(): { label: string, value: string }[] {
  const allTimezones = tc.getAllTimezones();
  const timezones: { label: string, value: string }[] = [];
  Object.keys(allTimezones).forEach((key) => {
    const tz = allTimezones[key as keyof typeof allTimezones];
    timezones.push({
      label: `${tz.name} (${tz.utcOffsetStr})`,
      value: tz.name,
    });
  });

  return timezones;
}

export default function FieldTimezone({
  label,
  name,
  errors,
  isLight = false,
  errorName = '',
  control,
}: FieldTimezoneProps) {
  return (
    <FieldSelect
      isLight={isLight}
      label={label}
      name={name}
      values={getFormatTimezones()}
      control={control}
      errors={errors}
      errorName={errorName}
    />
  );
}
