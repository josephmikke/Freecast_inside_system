import React, {
  Dispatch, SetStateAction, useEffect, useRef, useState,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import useSelectCategories from '@/domain/selecthooks/useSelectCategories';
import { OptionType } from '@components/filtersAndSorters/Sorters';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import useSelectPlatforms from '@/domain/selecthooks/useSelectPlatforms';
import useSelectProviders from '@/domain/selecthooks/useSelectProviders';
import filtersSelectStyles from '@components/filtersAndSorters/filtersSelectStyles';

interface ChannelsFiltersProps {
  selectedActive: OptionType | undefined;
  setSelectedActive: Dispatch<SetStateAction<OptionType | undefined>>;
  selectedCategories: OptionType[] | undefined;
  setSelectedCategories: Dispatch<SetStateAction<OptionType[] | undefined>>;
  selectedPackages: OptionType[] | undefined;
  setSelectedPackages: Dispatch<SetStateAction<OptionType[] | undefined>>;
  selectedPlatforms: OptionType[] | undefined;
  setSelectedPlatforms: Dispatch<SetStateAction<OptionType[] | undefined>>;
  selectedProviders: OptionType[] | undefined;
  setSelectedProviders: Dispatch<SetStateAction<OptionType[] | undefined>>;
}

export default function ChannelsFilters({
  selectedActive,
  setSelectedActive,
  selectedCategories,
  setSelectedCategories,
  selectedPackages,
  setSelectedPackages,
  selectedPlatforms,
  setSelectedPlatforms,
  selectedProviders,
  setSelectedProviders,
}: ChannelsFiltersProps) {
  const [accordionOpen, setAccordionOpen] = useState<boolean>(false);
  const { categories } = useSelectCategories();
  const { packages } = useSelectPackages();
  const { platforms } = useSelectPlatforms();
  const { providers } = useSelectProviders();
  const accordionRef = useRef(null);
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

  const getFilterAccordionLabel = (): string => {
    if (!selectedPackages?.length
      && !selectedProviders?.length
      && !selectedCategories?.length
      && !selectedPlatforms?.length
      && !selectedActive) {
      return 'Filters';
    }
    const label = [];
    if (selectedPackages?.length) {
      label.push(`${selectedPackages.length} package${selectedPackages.length > 1 ? 's' : ''}`);
    }
    if (selectedProviders?.length) {
      label.push(`${selectedProviders.length} provider${selectedProviders.length > 1 ? 's' : ''}`);
    }
    if (selectedCategories?.length) {
      label.push(`${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'}`);
    }
    if (selectedPlatforms?.length) {
      label.push(`${selectedPlatforms.length} platform${selectedPlatforms.length > 1 ? 's' : ''}`);
    }
    if (selectedActive) {
      label.push(`${selectedActive.label}`);
    }
    return label.join(', ');
  };

  const clearFilters = () => {
    setSelectedCategories(undefined);
    setSelectedPackages(undefined);
    setSelectedPlatforms(undefined);
    setSelectedProviders(undefined);
    setSelectedActive(undefined);
  };
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
        <div className="absolute z-10 mt-1 rounded-xl shadow-2xl p-3 bg-gray-light flex flex-col gap-4">
          <Select
            isClearable
            styles={filtersSelectStyles}
            value={selectedActive}
            onChange={(value) => setSelectedActive(value as OptionType)}
            placeholder="Active"
            className="w-64 bg-gray-dark"
            options={[{ value: 'true', label: 'Is active' }, { value: 'false', label: 'Is inactive' }]}
          />
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedCategories}
            onChange={(value) => setSelectedCategories(value as OptionType[])}
            placeholder="Categories"
            className="w-64 bg-gray-dark"
            options={categories}
          />
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedPackages}
            onChange={(value) => setSelectedPackages(value as OptionType[])}
            placeholder="Packages"
            className="w-64 bg-gray-dark"
            options={packages as any}
          />
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedPlatforms}
            onChange={(value) => setSelectedPlatforms(value as OptionType[])}
            placeholder="Platforms"
            className="w-64 bg-gray-dark"
            options={platforms as any}
          />
          <Select
            isMulti
            isClearable
            styles={filtersSelectStyles}
            value={selectedProviders}
            onChange={(value) => setSelectedProviders(value as OptionType[])}
            placeholder="Providers"
            className="w-64 bg-gray-dark"
            options={providers as any}
          />
        </div>
      )}
    </div>
  );
}
