import { S3Client } from '@aws-sdk/client-s3';

import BaseStorage from './BaseStorage';
import { IStorageAdaptor } from './interfaces/IStorageAdaptor';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import { StorageError } from './StorageError';

export default class StorageAdaptor extends BaseStorage implements IStorageAdaptor {
  constructor(
    client: S3Client,
    bucketName: string,
    private readonly uid: UID,
  ) {
    super(client, bucketName);
  }

  private static getFileExtension(file: string) {
    try {
      return file.split('/')[1].split(';')[0];
    } catch (e) {
      throw new StorageError.InvalidBase64();
    }
  }

  async store(
    path: string,
    file: string,
    filename: string = this.uid.generate(8),
  ): Promise<string> {
    try {
      const buffer = Buffer.from(file.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const filenameWithExtension = `${filename}.${StorageAdaptor.getFileExtension(file)}`;
      const key = `${path}/${filenameWithExtension}`;
      await this.putObject(key, buffer);
      return key;
    } catch (e) {
      throw new StorageError.UnableToStoreFile(e);
    }
  }

  async remove(path: string): Promise<boolean> {
    try {
      return !!await this.deleteObject(`${path}`);
    } catch (e) {
      throw new StorageError.UnableToDeleteFile(e);
    }
  }
}
