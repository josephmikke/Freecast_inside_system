import React, { useState } from 'react';
import { UseFormRegister } from 'react-hook-form';
import { FieldImage } from '@components/form';

interface ImagesFieldsProps {
  data: any;
  errors: any;
  register: UseFormRegister<any>;
}

function buttonClassName(selected: boolean): string {
  return `w-64 px-3 py-1 rounded-xl ${selected ? 'bg-green' : 'bg-gray-dark border-2 border-white'}`;
}

export default function ImagesFields({
  data,
  errors,
  register,
}: ImagesFieldsProps) {
  const [selectedImage, setSelectedImage] = useState<'main' | 'alternate' | 'background'>('main');

  return (
    <div>
      <div className="my-3">
        <button
          className={buttonClassName(selectedImage === 'main')}
          type="button"
          onClick={() => setSelectedImage('main')}
        >
          Main Image
        </button>
        <div>
          {errors?.thumbnail?.message && <span className="text-red text-sm">{errors?.thumbnail?.message}</span>}
        </div>
        <FieldImage
          containerClassName={`mt-3 ${selectedImage === 'main' ? '' : 'hidden'}`}
          name="thumbnail"
          errors={{}}
          register={register}
          imageSrc={data?.thumbnail}
        />
      </div>
      <div className="my-3">
        <button
          className={buttonClassName(selectedImage === 'alternate')}
          type="button"
          onClick={() => setSelectedImage('alternate')}
        >
          Alternate Image
        </button>
        <div>
          {errors?.alternateThumbnail?.message && <span className="text-red text-sm">{errors?.alternateThumbnail?.message}</span>}
        </div>
        <FieldImage
          containerClassName={`mt-3 ${selectedImage === 'alternate' ? '' : 'hidden'}`}
          name="alternateThumbnail"
          errors={{}}
          register={register}
          imageSrc={data?.alternateThumbnail}
        />
      </div>
      <div className="my-3">
        <button
          className={buttonClassName(selectedImage === 'background')}
          type="button"
          onClick={() => setSelectedImage('background')}
        >
          Background Image
        </button>
        <div>
          {errors?.backgroundThumbnail?.message && <span className="text-red text-sm">{errors?.backgroundThumbnail?.message}</span>}
        </div>
        <FieldImage
          containerClassName={`mt-3 ${selectedImage === 'background' ? '' : 'hidden'}`}
          name="backgroundThumbnail"
          errors={{}}
          register={register}
          imageSrc={data?.backgroundThumbnail}
        />
      </div>
    </div>
  );
}
