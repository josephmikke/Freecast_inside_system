import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export default class BaseStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucketName: string,
  ) {}

  async putObject(key: string, file: Buffer) {
    try {
      const [, extension] = key.split('.');
      const mime = `image/${extension}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentEncoding: 'base64',
        ContentType: mime,
      });
      return await this.client.send(command);
    } catch (err) {
      console.error("Can't put object in S3");
      throw new Error(err);
    }
  }

  async deleteObject(key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await this.client.send(command);
    } catch (err) {
      console.error("Can't delete object in S3");
      throw new Error(err);
    }
  }
}
