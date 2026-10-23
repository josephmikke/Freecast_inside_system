import React, { useState } from 'react';
import Modal from 'react-modal';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { Auth } from 'aws-amplify';
import { toast } from 'react-toastify';
import { Field } from '@components/form';
import modalStyles from '@/styles/modalStyles';

type NewPasswordForm = {
  oldPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
};

const validationSchema = Yup.object().shape({
  oldPassword: Yup.string().required('Old password is required'),
  newPassword: Yup.string().required('New password is required'),
  newPasswordConfirmation: Yup.string().required('New password confirmation is required').test('passwords-match', 'Passwords must match', function (value) {
    return this.parent.newPassword === value;
  }),
});

export default function EditPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordForm>({ resolver: yupResolver(validationSchema) });
  const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);

  const onSubmit = async (data: NewPasswordForm) => {
    try {
      const user = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(user, data.oldPassword, data.newPassword);
      toast.success('Password changed successfully');
      setPasswordModalOpen(false);
    } catch (error: any) {
      toast.error(`Unable to change password : ${JSON.stringify(error.message)}`);
    }
  };

  return (
    <>
      <button className="px-3 py-1 !w-48 bg-gray hover:bg-gray-light rounded-xl" onClick={() => setPasswordModalOpen(true)} type="button">Edit password</button>
      <Modal
        ariaHideApp={false}
        style={modalStyles}
        isOpen={passwordModalOpen}
        onRequestClose={() => setPasswordModalOpen(false)}
      >
        <h3 className="text-xl mb-6">Edit password</h3>
        <form className="flex-col" onSubmit={handleSubmit(onSubmit)}>
          <Field
            inputClassName="!bg-gray-dark"
            label="Old password"
            name="oldPassword"
            type="password"
            register={register}
            errors={errors}
          />
          <Field
            label="New password"
            inputClassName="!bg-gray-dark"
            name="newPassword"
            type="password"
            register={register}
            errors={errors}
          />
          <Field
            inputClassName="!bg-gray-dark"
            label="New password confirmation"
            name="newPasswordConfirmation"
            type="password"
            register={register}
            errors={errors}
          />
          <div className="w-full flex gap-8 justify-center flex-row">
            <button className="bg-gray-light w-32 py-1 rounded-xl" onClick={() => setPasswordModalOpen(false)} type="button">Cancel</button>
            <button className="bg-green w-32 py-1 rounded-xl" type="submit">Save</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
