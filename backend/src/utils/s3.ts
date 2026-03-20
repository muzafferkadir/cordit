import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketLifecycleConfigurationCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { logger } from './logger';

const s3Client = new S3Client({
  endpoint: config.minio.endpoint,
  region: config.minio.region,
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
  forcePathStyle: true,
});

function toPublicEndpoint(url: string): string {
  if (config.minio.endpoint !== config.minio.publicEndpoint) {
    return url.replace(config.minio.endpoint, config.minio.publicEndpoint);
  }

  return url;
}

export async function initBucket(): Promise<void> {
  const bucket = config.minio.bucket;
  const lifecycleDays = config.upload.lifecycleExpiryDays;

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    logger.info(`S3 bucket "${bucket}" already exists`);
  } catch {
    logger.info(`Creating S3 bucket "${bucket}"...`);
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
    logger.info(`S3 bucket "${bucket}" created`);
  }

  try {
    await s3Client.send(
      new PutBucketLifecycleConfigurationCommand({
        Bucket: bucket,
        LifecycleConfiguration: {
          Rules: [
            {
              ID: `auto-expire-${lifecycleDays}d`,
              Status: 'Enabled',
              Filter: { Prefix: '' },
              Expiration: { Days: lifecycleDays },
            },
          ],
        },
      }),
    );
    logger.info(`S3 bucket lifecycle rule set (${lifecycleDays} day expiry)`);
  } catch (error) {
    logger.warn('Failed to set bucket lifecycle rule (MinIO may not support it in dev mode):', error);
  }
}

export async function generateUploadUrl(
  key: string,
  contentType: string,
  fileSize: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.minio.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: config.upload.uploadUrlExpirySeconds });
  return toPublicEndpoint(url);
}

export async function generateDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.minio.bucket,
    Key: key,
  });

  // Generate presigned URL using internal endpoint, then replace with public endpoint
  const url = await getSignedUrl(s3Client, command, { expiresIn: config.upload.downloadUrlExpirySeconds });
  return toPublicEndpoint(url);
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
  contentLength: number,
): Promise<void> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.minio.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.minio.bucket,
      Key: key,
    }),
  );
}

export { s3Client };
