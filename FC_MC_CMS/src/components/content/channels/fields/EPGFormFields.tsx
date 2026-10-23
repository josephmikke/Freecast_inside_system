import React, { useState } from 'react';
import { Control, UseFormRegister } from 'react-hook-form';
import moment from 'moment';
import {
  Field, FieldImage, FieldSelect, FieldTextarea,
} from '@components/form';
import IngestionSchedule from '@components/content/channels/fields/IngestionSchedule';
import useSelectEpgTemplates from '@/domain/selecthooks/useSelectEpgTemplates';
import FieldTimezone from '@components/form/FieldTimezone';
import EPGTable from '@components/content/channels/epg/EPGTable';
import EditEPGProgramFormModal from '@components/content/channels/epg/EditEPGProgramFormModal';

interface EPGFormFieldsProps {
  control: Control<any>;
  errors: any;
  register: UseFormRegister<any>;
  data: any;
  refetch: () => void;
}

export default function EPGFormFields({
  control,
  errors,
  register,
  data,
  refetch,
}: EPGFormFieldsProps) {
  const [epgDate, setEpgDate] = useState<string>('');
  const { epgTemplates } = useSelectEpgTemplates();
  const [selectedEPGProgram, setSelectedEPGProgram] = useState<number>(-1);

  const onClickRow = (id: string) => {
    if ('epg' in data && 'programs' in data.epg) {
      const index = data.epg.programs.findIndex((program: any) => program.id === id);

      setSelectedEPGProgram(index);
    }
  };

  const getDataForEpgProgramsTable = () => {
    if (data?.epg?.programs) {
      return data.epg.programs.filter(
        (program: any) => {
          if (!epgDate || !moment(epgDate).isValid()) return true;
          return moment(program.start_date).isSame(moment(epgDate), 'day')
          || moment(program.end_date).isSame(moment(epgDate, 'day'));
        },
      );
    }
    return [];
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-row w-full">
        <div className="flex flex-col w-1/2">
          <Field
            label="Name"
            name="epg.name"
            type="string"
            errorName="name"
            register={register}
            errors={errors?.epg}
          />
          <FieldSelect
            isLight
            control={control}
            label="EPG Template"
            name="epg.epgTemplate"
            errorName="epgTemplate"
            values={epgTemplates}
            errors={errors?.epg}
          />
          <FieldTextarea
            rows={6}
            containerClassName="mt-3"
            label="Ingestion URL"
            name="epg.ingestionUrl"
            errorName="ingestionUrl"
            register={register}
            errors={errors?.epg}
          />
          <FieldImage
            label="Program Placeholder Image"
            name="epg.thumbnail"
            errors={errors?.epg}
            errorName="thumbnail"
            register={register}
            imageSrc={data?.epg?.thumbnail}
          />
        </div>
        <div className="flex flex-col w-1/2">
          <div className="flex flex-row items-center">
            <FieldTimezone
              label="EPG Display Time"
              name="epg.timezone"
              errorName="timezone"
              control={control}
              isLight
              errors={errors?.epg}
            />
            <span className="mt-8 ml-3">UTC</span>
          </div>
          <span className="text-gray-light text-sm italic mb-6 mt-2">
            Choose the UTC Time Offset the Start and End Times of the EPG
            will be displayed.
            <br />
            For help visit :
            {' '}
            <a className="text-blue" target="_blank" href="https://dayspedia.com/time-zone-map/" rel="noreferrer">https://dayspedia.com/time-zone-map/</a>
          </span>
          <IngestionSchedule
            register={register}
            name="epg.schedule"
            label="Ingestion Schedule"
            errorName="schedule"
            desc="Choose one option below"
            errors={errors?.epg}
            control={control}
          />
        </div>
      </div>
      <div className="flex flex-col w-full mt-32">
        <div className="flex flex-row w-full justify-between">
          <p>EPG Programs</p>
          <p>
            Last Ingestion:
            {' '}
            {data?.epg?.updatedAt ? moment(data.epg.updatedAt).format('MM/DD/YYYY HH:mm') : 'N/A'}
            {' '}
            UTC
          </p>
          <div className="flex flex-row items-center">
            <p className="mr-6">Selected Date</p>
            <div className="form_field_group !min-w-[200px]">
              <input
                value={epgDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEpgDate(e.target.value)}
                type="date"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-row w-full">
          <EPGTable
            onClickRow={onClickRow}
            data={getDataForEpgProgramsTable()}
            placeholderThumbnail={data?.epg?.thumbnail}
            refetch={refetch}
          />
        </div>
        <EditEPGProgramFormModal
          refetch={refetch}
          epg={data?.epg}
          selectedEpgIndex={selectedEPGProgram}
          isOpen={selectedEPGProgram !== -1}
          setOpen={setSelectedEPGProgram}
        />
      </div>
    </div>
  );
}
