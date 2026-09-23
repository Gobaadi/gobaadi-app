import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export interface UploadFileOptions {
  folder?: string;
  contentType?: string;
}

export interface UploadFileResult {
  url: string;
  key: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private client: S3Client | null = null;
  private readonly region?: string;
  private readonly bucket?: string;

  constructor() {
    this.region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.bucket = process.env.S3_BUCKET_NAME;

    if (this.region && accessKeyId && secretAccessKey && this.bucket) {
      this.client = new S3Client({
        region: this.region,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.logger.log('S3 successfully configured.');
    } else {
      this.logger.warn(
        'S3 credentials not found in env variables. Mock fallback will be used.',
      );
    }
  }

  async uploadFile(
    buffer: Buffer,
    opts: UploadFileOptions = {},
  ): Promise<UploadFileResult> {
    if (!this.client || !this.bucket || !this.region) {
      return {
        url: 'https://res.cloudinary.com/demo/raw/upload/v1570979139/sample.pdf',
        key: 'mock-public-id',
      };
    }

    const folder = opts.folder || 'gobadi';
    const key = `${folder}/${randomUUID()}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: opts.contentType || 'application/octet-stream',
        }),
      );

      return {
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
        key,
      };
    } catch (err) {
      this.logger.error(
        'Failed to upload file to S3, falling back to mock URL',
        err,
      );
      return {
        url: 'https://res.cloudinary.com/demo/raw/upload/v1570979139/sample.pdf',
        key: 'mock-public-id',
      };
    }
  }
}
