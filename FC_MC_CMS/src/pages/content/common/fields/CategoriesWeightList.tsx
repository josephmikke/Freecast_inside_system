import { Control, Controller } from 'react-hook-form';
import React from 'react';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface CategoriesWeightListProps {
  control: Control<any>;
}

export default function CategoriesWeightList({
  control,
}: CategoriesWeightListProps) {
  const onDeleteCategory = (cat: any, values: any, onChange: any) => {
    const newValues = [...values].filter((c: any) => c.value !== cat.value);
    onChange(newValues);
  };

  return (
    <Controller
      control={control}
      name="categories"
      render={(
        {
          field: {
            value,
            onChange,
          },
        }: any,
      ) => (
        <div className="!w-[600px]" key={value}>
          <div>
            <h3 className="text-xl">Categories Weights</h3>
            <h4 className="text-sm italic text-gray-light">Leave blank if weight is set by provider.</h4>
          </div>
          <div className="mt-6">
            {Array.isArray(value) && value.map((cat, idx: number) => (
              <div className="flex rounded p-3 pr-2 mb-3 w-fit bg-gray-light flex-row align-items " key={cat.value}>
                <div className="flex items-center w-[200px]">
                  {cat.label.split('(')[0].trim()}
                </div>
                <div className="flex flex-row items-center justify-between">
                  <span>Wt : </span>
                  <input
                    className="bg-gray ml-3 rounded-xl p-2"
                    type="number"
                    value={cat.weight}
                    onChange={({ target: { value: val } }) => {
                      const newValue = [...value];
                      if (Number.isNaN(val) || val === '' || val === null) {
                        newValue[idx].weight = null;
                      } else {
                        newValue[idx].weight = val;
                      }
                      onChange(newValue);
                    }}
                  />
                  <FontAwesomeIcon
                    icon={faTrash}
                    className="mx-3 cursor-pointer"
                    onClick={() => onDeleteCategory(cat, value, onChange)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    />
  );
}
