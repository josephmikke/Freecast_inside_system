import React from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import { Field, FieldCheckbox } from '@components/form';

interface FieldIngestionScheduleDetailProps {
  control: Control<any>;
  errors: any;
  selected: any;
  register: UseFormRegister<any>;
}

const weeklyDaysValues = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function FieldIngestionScheduleDetail({
  control,
  errors,
  selected,
  register,
}: FieldIngestionScheduleDetailProps) {
  if (selected.type === 'HOURLY') {
    return (
      <div className="absolute -mt-6">
        <div className="flex flex-row items-center">
          <span>Every: </span>
          <Field
            label=""
            containerClassName="!min-w-0 !w-40 mx-2"
            placeholder="Enter hours"
            name="epg.schedule.hourlyHour"
            type="string"
            register={register}
            errors={errors}
          />
          <span>Hour(s)</span>
        </div>
        <div>
          <span className="italic text-gray-light">
            HINT: Enter how many hours each ingestion should occur.
          </span>
        </div>
      </div>
    );
  } if (selected.type === 'DAILY') {
    return (
      <div className="absolute -mt-6">
        <div className="flex flex-row items-center">
          <span>At : </span>
          <Field
            label=""
            containerClassName="!min-w-0 !w-40 mx-2"
            placeholder="Enter HH:MM"
            name="epg.schedule.dailyHour"
            type="string"
            register={register}
            errors={errors}
          />
          <span>UTC</span>
        </div>
        <div>
          <span className="italic text-gray-light">
            HINT: Enter the time in 24 hour Format (Ex: 1pm should be 13:00).
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="absolute -mt-6">
      <div>
        <span>Every: </span>
        <FieldCheckbox
          lineOptionsClassName="!min-w-0"
          valuesContainerClassName="!flex-row"
          label=""
          name="epg.schedule.weeklyDays"
          errorName="weeklyDays"
          values={weeklyDaysValues}
          control={control}
          errors={errors}
        />
        <div>
          <span className="italic text-gray-light text-sm">
            HINT: Select each day the ingestion should occur each week.
          </span>
        </div>
      </div>
      <div className="flex flex-row items-center">
        <span>At : </span>
        <Field
          label=""
          containerClassName="!min-w-0 !w-40 mx-2"
          placeholder="Enter HH:MM"
          name="epg.schedule.weeklyHour"
          type="string"
          register={register}
          errors={errors}
        />
        <span>UTC</span>
      </div>
      <div>
        <span className="italic text-gray-light text-sm">
          HINT: Enter the time in 24 hour Format (Ex: 1pm should be 13:00).
        </span>
      </div>
    </div>
  );
}
