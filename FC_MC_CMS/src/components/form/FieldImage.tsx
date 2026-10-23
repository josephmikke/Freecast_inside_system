import React, { ChangeEvent, useState } from 'react';
import { UseFormRegister } from 'react-hook-form';
import fileToBase64 from '@utils/fileToBase64';

interface FieldImageProps {
  name: string;
  errors: any;
  register: UseFormRegister<any>;
  imageSrc: string;
  label?: string;
  errorName?: string;
  containerClassName?: string;
  idPrefix?: string;
}

export default function FieldImage({
  imageSrc,
  register,
  name,
  errors,
  label,
  errorName = '',
  containerClassName = '',
  idPrefix = '',
}: FieldImageProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { onChange, ...restRegister } = register(name);
  const inputId = `file-upload-${idPrefix}${idPrefix ? '-' : ''}${name}`;

  const handleOnChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const base64 = await fileToBase64(event.target.files[0]);

    if (base64) {
      setUploadedImage(base64);
    }

    onChange(event);
  };

  let src = uploadedImage || imageSrc;
  if (src && src.startsWith('https://')) {
    src += `?v=${new Date().getTime()}`;
  }

  return (
    <div className={containerClassName}>
      {label && (
        <div className="my-3">
          <label>{label}</label>
        </div>
      )}
      <div className="flex flex-row items-center">
        {(uploadedImage || imageSrc) && <img alt={name} className="h-16" src={src} />}
        <label className="!mb-0 ml-3 hover:bg-blue cursor-pointer px-3 py-1 justify-center items-center rounded-xl bg-gray-light" htmlFor={inputId}>
          <input {...restRegister} id={inputId} className="hidden" onChange={handleOnChange} type="file" />
          <span>{uploadedImage ? 'Image uploaded' : 'Upload image'}</span>
        </label>
      </div>
      <div className="flex flex-row">
        <span className="text-red text-sm">
          {errors?.[errorName || name]?.message}
        </span>
      </div>
    </div>
  );
}
