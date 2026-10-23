import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import filtersSelectStyles from '@components/filtersAndSorters/filtersSelectStyles';
import { OptionType } from '@components/filtersAndSorters/Sorters';
import useSelectCategories from '@/domain/selecthooks/useSelectCategories';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import useSelectPlatforms from '@/domain/selecthooks/useSelectPlatforms';
import useSelectProviders from '@/domain/selecthooks/useSelectProviders';
import useSelectGenres from '@/domain/selecthooks/useSelectGenres';
import setFilterFor from '@components/filtersAndSorters/setFilterFor';
import DoubleChoiceField from '@components/commons/forms/DoubleChoiceField';

interface VodFiltersProps {
  setFilter: any;
}

export default function VodFilters({
  setFilter,
}: VodFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [accordionOpen, setAccordionOpen] = useState<boolean>(false);
  const { categories } = useSelectCategories();
  const { packages } = useSelectPackages();
  const { platforms } = useSelectPlatforms();
  const { providers } = useSelectProviders();
  const { genres } = useSelectGenres();
  const [selectedCategories, setSelectedCategories] = useState<OptionType[]>();
  const [selectedPackages, setSelectedPackages] = useState<OptionType[]>();
  const [selectedPlatforms, setSelectedPlatforms] = useState<OptionType[]>();
  const [selectedProviders, setSelectedProviders] = useState<OptionType[]>();
  const [selectedGenres, setSelectedGenres] = useState<OptionType[]>();
  const [selectedActive, setSelectedActive] = useState<OptionType>();
  const [selectedMovieShow, onSelectMovieShow] = useState<'movies' | 'shows'>('movies');
  const accordionRef = useRef(null);

  const getFilterAccordionLabel = (): string => {
    if (!selectedPackages?.length
      && !selectedProviders?.length
      && !selectedCategories?.length
      && !selectedPlatforms?.length
      && !selectedGenres?.length
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
    if (selectedGenres?.length) {
      label.push(`${selectedGenres.length} genre${selectedGenres.length > 1 ? 's' : ''}`);
    }
    return label.join(', ');
  };

  const clearFilters = () => {
    setSelectedCategories(undefined);
    setSelectedPackages(undefined);
    setSelectedPlatforms(undefined);
    setSelectedProviders(undefined);
    setSelectedActive(undefined);
    setSelectedGenres(undefined);
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
    const type = searchParams.get('type');
    if (type === '' || !type) {
      setSearchParams({ type: 'movies' });
      onSelectMovieShow('movies');
      return;
    }
    if (searchParams.get('type') === 'shows') {
      onSelectMovieShow('shows');
    } else {
      onSelectMovieShow('movies');
    }
  }, [searchParams]);

  useEffect(() => setFilterFor('categories', selectedCategories, setFilter), [selectedCategories]);
  useEffect(() => setFilterFor('genres', selectedGenres, setFilter), [selectedGenres]);
  useEffect(() => setFilterFor('packages', selectedPackages, setFilter), [selectedPackages]);
  useEffect(() => setFilterFor('platforms', selectedPlatforms, setFilter), [selectedPlatforms]);
  useEffect(() => setFilterFor('provider', selectedProviders, setFilter), [selectedProviders]);
  useEffect(() => {
    if (selectedActive && selectedActive?.value === 'true') {
      setFilter('enabled', 'true');
    } else if (selectedActive && selectedActive?.value === 'false') {
      setFilter('enabled', 'false');
    } else {
      setFilter('enabled', null);
    }
  }, [selectedActive]);

  return (
    <div
      ref={accordionRef}
      className="flex relative flex-row"
    >
      <div>
        <DoubleChoiceField
          containerClassName="!mt-0 !h-[38px] mr-6"
          first={{ label: 'Movies', value: 'movies' }}
          second={{ label: 'Shows', value: 'shows' }}
          onSelect={(v) => {
            setSearchParams({ type: v });
            onSelectMovieShow(v as 'movies' | 'shows');
          }}
          selected={selectedMovieShow}
        />
      </div>
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
        <div className="absolute z-10 top-12 left-[290px] rounded-xl shadow-2xl p-3 bg-gray-light flex flex-col gap-4">
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
            value={selectedGenres}
            onChange={(value) => setSelectedGenres(value as OptionType[])}
            placeholder="Genres"
            className="w-64 bg-gray-dark"
            options={genres as any}
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
