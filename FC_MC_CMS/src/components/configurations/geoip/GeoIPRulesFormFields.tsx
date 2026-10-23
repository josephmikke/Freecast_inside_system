import React from 'react';
import { Control, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import {
  Field, FieldRadio, FieldSelect, FieldTextarea,
} from '@components/form';
import FieldRadioRuleType from '@components/configurations/geoip/fields/FieldRadioRuleType';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import { GeoIPRulePayload, GeoIPRuleResult } from '@entities/configurations/geoiprule';

interface GeoIpRulesFormFieldsProps {
  control: Control<any>;
  errors: any;
  register: UseFormRegister<any>;
  action: 'add' | 'edit';
  data: GeoIPRuleResult;
  setValue: UseFormSetValue<GeoIPRulePayload>;
}

export default function GeoIPRulesFormFields({
  control,
  errors,
  register,
  action,
  data,
  setValue,
}: GeoIpRulesFormFieldsProps) {
  const { packages } = useSelectPackages();
  return (
    <div className="flex flex-row">
      <div className="flex flex-col w-min mr-8">
        {action === 'add' ? (
          <Field
            inputClassName="!bg-gray-dark"
            containerClassName="pr-4"
            label="Rule Name"
            name="name"
            type="string"
            register={register}
            errors={errors}
          />
        ) : (
          <div>
            <label>Rule Name</label>
            <div className="min-w-[300px] mt-2 mb-2 p-4 bg-gray-dark rounded-xl">
              <p>{data.name}</p>
            </div>
          </div>
        )}
        {action === 'add' ? (
          <FieldTextarea
            rows={3}
            label="Rule Description"
            name="description"
            register={register}
            errors={errors}
            textAreaClassName="!bg-gray-dark"
            containerClassName="pr-4"
          />
        ) : (
          <div>
            <label>Rule Description</label>
            <div className="min-w-[300px] mt-2 mb-2 p-4 bg-gray-dark rounded-xl">
              <p>{data.description}</p>
            </div>
          </div>
        )}
        {action === 'add' ? (
          <FieldSelect
            containerClassName="!pr-4"
            isMulti
            label="Packages"
            name="packages"
            values={packages}
            control={control}
            errors={errors}
          />
        ) : (
          <div>
            <label>Packages</label>
            {!data?.packages?.length && (
              <p className="italic text-gray-light pt-2">No packages.</p>
            )}
            {data.packages?.map((p) => (
              <div className="mt-2 mb-2 p-4 bg-gray-dark rounded-xl">
                {p.name}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col w-min ">
        {action === 'add' ? (
          <FieldRadio
            label="Policy Type"
            name="policyType"
            values={['ALLOW', 'BLOCK']}
            control={control}
            errors={errors}
          />
        ) : (
          <div>
            <label>Policy Type</label>
            <div className="mt-2 mb-2 p-4 bg-gray-dark rounded-xl">
              {data.policyType ? (
                <p>{data.policyType}</p>
              ) : (
                <p className="italic text-gray-light">No policy type</p>
              )}
            </div>
          </div>
        )}
        {action === 'add' ? (
          <FieldRadioRuleType
            label="Rule Type"
            desc="*Only one option allowed."
            name="ruleType"
            setValue={setValue}
            control={control}
            errors={errors}
          />
        ) : (
          <div>
            <label>Rule Type</label>
            <div className="min-w-[300px] mt-2 mb-2 p-4 bg-gray-dark rounded-xl">
              {data.ruleType ? (
                <p>{data.ruleType}</p>
              ) : (
                <p className="italic text-gray-light">No rule type</p>
              )}
            </div>
            <label>Rule Data</label>
            <div className="min-w-[300px] mt-2 mb-2 p-4 bg-gray-dark rounded-xl">
              {data.value ? (
                <p>{data.value}</p>
              ) : (
                <p className="italic text-gray-light">No rule data</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
