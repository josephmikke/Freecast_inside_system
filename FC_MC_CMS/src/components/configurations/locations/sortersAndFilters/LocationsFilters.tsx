import React, { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import filtersSelectStyles from '@components/filtersAndSorters/filtersSelectStyles';
import setFilterFor from '@components/filtersAndSorters/setFilterFor';

interface LocationsFiltersProps {
  data: any;
  setFilter: any;
}

type OptionType = {
  value: string;
  label: string;
};

export default function LocationsFilters({
  data,
  setFilter,
}: LocationsFiltersProps) {
  const [accordionOpen, setAccordionOpen] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<any>();
  const [selectedCities, setSelectedCities] = useState<OptionType[]>();
  const [selectedCountries, setSelectedCountries] = useState<OptionType[]>();
  const [selectedZipcodes, setSelectedZipcodes] = useState<OptionType[]>();
  const [selectedStates, setSelectedStates] = useState<OptionType[]>();
  const { packages } = useSelectPackages();
  const [locationsByType, setLocationsByType] = useState<{ [k: string]: OptionType[] }>();
  const accordionRef = useRef(null);

  const getFilterAccordionLabel = (): string => {
    if (!selectedPackage
      && !selectedCities?.length
      && !selectedCountries?.length
      && !selectedZipcodes?.length
      && !selectedStates) {
      return 'Filters';
    }
    const label = [];
    if (selectedPackage?.length) {
      label.push(`${selectedPackage.length} package`);
    }
    if (selectedCities?.length) {
      label.push(`${selectedCities.length} cit${selectedCities.length > 1 ? 'ies' : 'y'}`);
    }
    if (selectedCountries?.length) {
      label.push(`${selectedCountries.length} countr${selectedCountries.length > 1 ? 'ies' : 'y'}`);
    }
    if (selectedZipcodes?.length) {
      label.push(`${selectedZipcodes.length} zipcode${selectedZipcodes.length > 1 ? 's' : ''}`);
    }
    if (selectedStates?.length) {
      label.push(`${selectedStates.length} state${selectedStates.length > 1 ? 's' : ''}`);
    }
    return label.join(', ');
  };

  const clearFilters = () => {
    setSelectedCities(undefined);
    setSelectedCountries(undefined);
    setSelectedStates(undefined);
    setSelectedZipcodes(undefined);
    setSelectedPackage(undefined);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accordionRef.current && !(accordionRef.current as any).contains(event.target)) {
        setAccordionOpen(false);
      }
    }

    document.body.addEventListener('click', handleClickOutside);

    return () => {
      document.body.removeEventListener('click', handleClickOutside);
    };
  }, [accordionRef]);

  useEffect(() => {
    if (data && data.length > 0) {
      setLocationsByType({
        countries: data.filter((l: any) => l.type === 'COUNTRY').map((l: any) => ({ label: l.name, value: l.id })),
        states: data.filter((l: any) => l.type === 'STATE').map((l: any) => ({ label: l.name, value: l.id })),
        cities: data.filter((l: any) => l.type === 'CITY').map((l: any) => ({ label: l.name, value: l.id })),
        zipcodes: data.filter((l: any) => l.type === 'ZIPCODE').map((l: any) => ({ label: l.name, value: l.id })),
      });
    }
  }, []);

  useEffect(() => setFilterFor('packages', selectedPackage, setFilter), [selectedPackage]);
  useEffect(() => setFilterFor('states', selectedStates, setFilter), [selectedStates]);
  useEffect(() => setFilterFor('cities', selectedCities, setFilter), [selectedCities]);
  useEffect(() => setFilterFor('countries', selectedCountries, setFilter), [selectedCountries]);
  useEffect(() => setFilterFor('zipcodes', selectedZipcodes, setFilter), [selectedZipcodes]);

  return (
    <div ref={accordionRef} className="border-none">
      <div
        className="border-none justify-between flex items-center rounded w-64 bg-gray-light px-3 h-[38px]"
        onClick={() => setAccordionOpen((val: boolean) => !val)}
      >
        <div className="text-white !overflow-y-scroll text-base">
          <p className="truncate">{getFilterAccordionLabel()}</p>
        </div>
        {getFilterAccordionLabel() !== 'Filters' && (
          <FontAwesomeIcon
            onClick={clearFilters}
            className="cursor-pointer ml-auto mr-3"
            icon={faXmark}
            color="white"
          />
        )}
        <div className="flex flex-row items-center">
          <div className="w-[1px] h-[25px] bg-white bg-opacity-60" />
          <FontAwesomeIcon className="ml-3" icon={faChevronDown} color="white" />
        </div>
      </div>
      {accordionOpen && (
        <div className="absolute z-10 rounded-xl shadow-2xl p-3 bg-gray-light flex flex-col gap-4">
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedCountries}
            onChange={(value) => setSelectedCountries(value as OptionType[])}
            placeholder="Countries"
            className="w-64 bg-gray-dark"
            options={locationsByType?.countries}
          />
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedStates}
            onChange={(value) => setSelectedStates(value as OptionType[])}
            placeholder="States"
            className="w-64 bg-gray-dark"
            options={locationsByType?.states}
          />
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedCities}
            onChange={(value) => setSelectedCities(value as OptionType[])}
            placeholder="Cities"
            className="w-64 bg-gray-dark"
            options={locationsByType?.cities}
          />
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedZipcodes}
            onChange={(value) => setSelectedZipcodes(value as OptionType[])}
            placeholder="Zip Codes"
            className="w-64 bg-gray-dark"
            options={locationsByType?.zipcodes}
          />
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedPackage}
            onChange={(value) => setSelectedPackage(value)}
            placeholder="Packages"
            className="w-64 bg-gray-dark"
            options={packages}
          />
        </div>
      )}
    </div>
  );
}
