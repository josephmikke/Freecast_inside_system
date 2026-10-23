import { Control, Controller, UseFormSetValue } from 'react-hook-form';
import React, { useState } from 'react';
import { FieldSelect } from '@components/form/index';
import { GeoIPRulePayload, GeoIPRuleRuleType } from '@entities/configurations/geoiprule';

interface FieldRadioRuleTypeDetailProps {
  name: string;
  rule: GeoIPRuleRuleType;
  control: Control<any>;
  errors: any;
  setValue: UseFormSetValue<GeoIPRulePayload>;
}

const locations = [
  { value: 'AD', label: 'AD' },
  { value: 'AE', label: 'AE' },
  { value: 'AF', label: 'AF' },
  { value: 'AG', label: 'AG' },
  { value: 'AI', label: 'AI' },
  { value: 'AL', label: 'AL' },
  { value: 'AM', label: 'AM' },
  { value: 'AO', label: 'AO' },
  { value: 'AQ', label: 'AQ' },
  { value: 'AR', label: 'AR' },
  { value: 'AS', label: 'AS' },
  { value: 'AT', label: 'AT' },
  { value: 'AU', label: 'AU' },
  { value: 'AW', label: 'AW' },
  { value: 'AX', label: 'AX' },
  { value: 'AZ', label: 'AZ' },
  { value: 'BA', label: 'BA' },
  { value: 'BB', label: 'BB' },
  { value: 'BD', label: 'BD' },
  { value: 'BE', label: 'BE' },
  { value: 'BF', label: 'BF' },
  { value: 'BG', label: 'BG' },
  { value: 'BH', label: 'BH' },
  { value: 'BI', label: 'BI' },
  { value: 'BJ', label: 'BJ' },
  { value: 'BL', label: 'BL' },
  { value: 'BM', label: 'BM' },
  { value: 'BN', label: 'BN' },
  { value: 'BO', label: 'BO' },
  { value: 'BQ', label: 'BQ' },
  { value: 'BR', label: 'BR' },
  { value: 'BS', label: 'BS' },
  { value: 'BT', label: 'BT' },
  { value: 'BV', label: 'BV' },
  { value: 'BW', label: 'BW' },
  { value: 'BY', label: 'BY' },
  { value: 'BZ', label: 'BZ' },
  { value: 'CA', label: 'CA' },
  { value: 'CC', label: 'CC' },
  { value: 'CD', label: 'CD' },
  { value: 'CF', label: 'CF' },
  { value: 'CG', label: 'CG' },
  { value: 'CH', label: 'CH' },
  { value: 'CI', label: 'CI' },
  { value: 'CK', label: 'CK' },
  { value: 'CL', label: 'CL' },
  { value: 'CM', label: 'CM' },
  { value: 'CN', label: 'CN' },
  { value: 'CO', label: 'CO' },
  { value: 'CR', label: 'CR' },
  { value: 'CU', label: 'CU' },
  { value: 'CV', label: 'CV' },
  { value: 'CW', label: 'CW' },
  { value: 'CX', label: 'CX' },
  { value: 'CY', label: 'CY' },
  { value: 'CZ', label: 'CZ' },
  { value: 'DE', label: 'DE' },
  { value: 'DJ', label: 'DJ' },
  { value: 'DK', label: 'DK' },
  { value: 'DM', label: 'DM' },
  { value: 'DO', label: 'DO' },
  { value: 'DZ', label: 'DZ' },
  { value: 'EC', label: 'EC' },
  { value: 'EE', label: 'EE' },
  { value: 'EG', label: 'EG' },
  { value: 'EH', label: 'EH' },
  { value: 'ER', label: 'ER' },
  { value: 'ES', label: 'ES' },
  { value: 'ET', label: 'ET' },
  { value: 'FI', label: 'FI' },
  { value: 'FJ', label: 'FJ' },
  { value: 'FK', label: 'FK' },
  { value: 'FM', label: 'FM' },
  { value: 'FO', label: 'FO' },
  { value: 'FR', label: 'FR' },
  { value: 'GA', label: 'GA' },
  { value: 'GB', label: 'GB' },
  { value: 'GD', label: 'GD' },
  { value: 'GE', label: 'GE' },
  { value: 'GF', label: 'GF' },
  { value: 'GG', label: 'GG' },
  { value: 'GH', label: 'GH' },
  { value: 'GI', label: 'GI' },
  { value: 'GL', label: 'GL' },
  { value: 'GM', label: 'GM' },
  { value: 'GN', label: 'GN' },
  { value: 'GP', label: 'GP' },
  { value: 'GQ', label: 'GQ' },
  { value: 'GR', label: 'GR' },
  { value: 'GS', label: 'GS' },
  { value: 'GT', label: 'GT' },
  { value: 'GU', label: 'GU' },
  { value: 'GW', label: 'GW' },
  { value: 'GY', label: 'GY' },
  { value: 'HK', label: 'HK' },
  { value: 'HM', label: 'HM' },
  { value: 'HN', label: 'HN' },
  { value: 'HR', label: 'HR' },
  { value: 'HT', label: 'HT' },
  { value: 'HU', label: 'HU' },
  { value: 'ID', label: 'ID' },
  { value: 'IE', label: 'IE' },
  { value: 'IL', label: 'IL' },
  { value: 'IM', label: 'IM' },
  { value: 'IN', label: 'IN' },
  { value: 'IO', label: 'IO' },
  { value: 'IQ', label: 'IQ' },
  { value: 'IR', label: 'IR' },
  { value: 'IS', label: 'IS' },
  { value: 'IT', label: 'IT' },
  { value: 'JE', label: 'JE' },
  { value: 'JM', label: 'JM' },
  { value: 'JO', label: 'JO' },
  { value: 'JP', label: 'JP' },
  { value: 'KE', label: 'KE' },
  { value: 'KG', label: 'KG' },
  { value: 'KH', label: 'KH' },
  { value: 'KI', label: 'KI' },
  { value: 'KM', label: 'KM' },
  { value: 'KN', label: 'KN' },
  { value: 'KP', label: 'KP' },
  { value: 'KR', label: 'KR' },
  { value: 'KW', label: 'KW' },
  { value: 'KY', label: 'KY' },
  { value: 'KZ', label: 'KZ' },
  { value: 'LA', label: 'LA' },
  { value: 'LB', label: 'LB' },
  { value: 'LC', label: 'LC' },
  { value: 'LI', label: 'LI' },
  { value: 'LK', label: 'LK' },
  { value: 'LR', label: 'LR' },
  { value: 'LS', label: 'LS' },
  { value: 'LT', label: 'LT' },
  { value: 'LU', label: 'LU' },
  { value: 'LV', label: 'LV' },
  { value: 'LY', label: 'LY' },
  { value: 'MA', label: 'MA' },
  { value: 'MC', label: 'MC' },
  { value: 'MD', label: 'MD' },
  { value: 'ME', label: 'ME' },
  { value: 'MF', label: 'MF' },
  { value: 'MG', label: 'MG' },
  { value: 'MH', label: 'MH' },
  { value: 'MK', label: 'MK' },
  { value: 'ML', label: 'ML' },
  { value: 'MM', label: 'MM' },
  { value: 'MN', label: 'MN' },
  { value: 'MO', label: 'MO' },
  { value: 'MP', label: 'MP' },
  { value: 'MQ', label: 'MQ' },
  { value: 'MR', label: 'MR' },
  { value: 'MS', label: 'MS' },
  { value: 'MT', label: 'MT' },
  { value: 'MU', label: 'MU' },
  { value: 'MV', label: 'MV' },
  { value: 'MW', label: 'MW' },
  { value: 'MX', label: 'MX' },
  { value: 'MY', label: 'MY' },
  { value: 'MZ', label: 'MZ' },
  { value: 'NA', label: 'NA' },
  { value: 'NC', label: 'NC' },
  { value: 'NE', label: 'NE' },
  { value: 'NF', label: 'NF' },
  { value: 'NG', label: 'NG' },
  { value: 'NI', label: 'NI' },
  { value: 'NL', label: 'NL' },
  { value: 'NO', label: 'NO' },
  { value: 'NP', label: 'NP' },
  { value: 'NR', label: 'NR' },
  { value: 'NU', label: 'NU' },
  { value: 'NZ', label: 'NZ' },
  { value: 'OM', label: 'OM' },
  { value: 'PA', label: 'PA' },
  { value: 'PE', label: 'PE' },
  { value: 'PF', label: 'PF' },
  { value: 'PG', label: 'PG' },
  { value: 'PH', label: 'PH' },
  { value: 'PK', label: 'PK' },
  { value: 'PL', label: 'PL' },
  { value: 'PM', label: 'PM' },
  { value: 'PN', label: 'PN' },
  { value: 'PR', label: 'PR' },
  { value: 'PS', label: 'PS' },
  { value: 'PT', label: 'PT' },
  { value: 'PW', label: 'PW' },
  { value: 'PY', label: 'PY' },
  { value: 'QA', label: 'QA' },
  { value: 'RE', label: 'RE' },
  { value: 'RO', label: 'RO' },
  { value: 'RS', label: 'RS' },
  { value: 'RU', label: 'RU' },
  { value: 'RW', label: 'RW' },
  { value: 'SA', label: 'SA' },
  { value: 'SB', label: 'SB' },
  { value: 'SC', label: 'SC' },
  { value: 'SD', label: 'SD' },
  { value: 'SE', label: 'SE' },
  { value: 'SG', label: 'SG' },
  { value: 'SH', label: 'SH' },
  { value: 'SI', label: 'SI' },
  { value: 'SJ', label: 'SJ' },
  { value: 'SK', label: 'SK' },
  { value: 'SL', label: 'SL' },
  { value: 'SM', label: 'SM' },
  { value: 'SN', label: 'SN' },
  { value: 'SO', label: 'SO' },
  { value: 'SR', label: 'SR' },
  { value: 'SS', label: 'SS' },
  { value: 'ST', label: 'ST' },
  { value: 'SV', label: 'SV' },
  { value: 'SX', label: 'SX' },
  { value: 'SY', label: 'SY' },
  { value: 'SZ', label: 'SZ' },
  { value: 'TC', label: 'TC' },
  { value: 'TD', label: 'TD' },
  { value: 'TF', label: 'TF' },
  { value: 'TG', label: 'TG' },
  { value: 'TH', label: 'TH' },
  { value: 'TJ', label: 'TJ' },
  { value: 'TK', label: 'TK' },
  { value: 'TL', label: 'TL' },
  { value: 'TM', label: 'TM' },
  { value: 'TN', label: 'TN' },
  { value: 'TO', label: 'TO' },
  { value: 'TR', label: 'TR' },
  { value: 'TT', label: 'TT' },
  { value: 'TV', label: 'TV' },
  { value: 'TW', label: 'TW' },
  { value: 'TZ', label: 'TZ' },
  { value: 'UA', label: 'UA' },
  { value: 'UG', label: 'UG' },
  { value: 'UM', label: 'UM' },
  { value: 'US', label: 'US' },
  { value: 'UY', label: 'UY' },
  { value: 'UZ', label: 'UZ' },
  { value: 'VA', label: 'VA' },
  { value: 'VC', label: 'VC' },
  { value: 'VE', label: 'VE' },
  { value: 'VG', label: 'VG' },
  { value: 'VI', label: 'VI' },
  { value: 'VN', label: 'VN' },
  { value: 'VU', label: 'VU' },
  { value: 'WF', label: 'WF' },
  { value: 'WS', label: 'WS' },
  { value: 'XK', label: 'XK' },
  { value: 'YE', label: 'YE' },
  { value: 'YT', label: 'YT' },
  { value: 'ZA', label: 'ZA' },
  { value: 'ZM', label: 'ZM' },
  { value: 'ZW', label: 'ZW' },
];

export default function FieldRadioRuleTypeDetail({
  name,
  rule,
  control,
  errors,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setValue,
}: FieldRadioRuleTypeDetailProps) {
  const [error, setError] = useState<string>('');
  const placeholders: any = {
    SUBNET: 'Enter the IP address with mask',
    SPECIFIC_IP: 'Enter the IP address',
    LOCATION: 'Select a location',
    USER_AGENT: 'Enter the User Agent',
  };

  const customOnChange = (event: any) => {
    setValue('value', event);

    if (rule === 'SPECIFIC_IP') {
      const isMatch = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/.test(event);
      if (!isMatch) {
        setError('Invalid IP address');
      } else {
        setError('');
      }
    }

    if (rule === 'SUBNET') {
      const ipRegex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
      const isMatch = ipRegex.test(event);
      if (!isMatch) {
        setError('Invalid IP address or mask');
      } else {
        setError('');
      }
    }
  };

  if (rule === 'LOCATION') {
    return (
      <FieldSelect
        containerClassName="absolute"
        hideLabel
        label="location"
        name="location"
        values={locations}
        control={control}
        errors={errors}
      />
    );
  }

  return (
    <Controller
      control={control}
      name="value"
      render={(
        {
          field: {
            value, ref,
          },
        }: any,
      ) => (
        <div className="form_field_group absolute">
          <input
            className="!bg-gray-dark"
            type="text"
            placeholder={placeholders[rule]}
            ref={ref}
            value={value}
            onChange={(v) => customOnChange(v.target.value)}
          />
          <div className="form_field_error">{errors[name]?.message}</div>
          <div className="">
            <p className="text-red">
              {error}
            </p>
          </div>
        </div>
      )}
    />
  );
}
