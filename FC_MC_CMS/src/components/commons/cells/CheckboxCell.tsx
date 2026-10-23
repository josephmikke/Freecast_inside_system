import React, { useState } from 'react';
import CustomLoader from '@components/commons/CustomLoader';

interface CheckboxCellProps {
  checked: boolean;
  onChange: (isChecked: boolean) => Promise<void>;
}

export default function CheckboxCell({ checked, onChange }: CheckboxCellProps) {
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setLoading(true);
    await onChange(event.target.checked);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center">
        <CustomLoader contained={false} size={30} />
      </div>
    );
  }

  return (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      <label className="relative inline-flex items-center cursor-pointer">
        <input onChange={handleChange} type="checkbox" checked={checked} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-lighter peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue" />
      </label>
    </div>
  );
}
