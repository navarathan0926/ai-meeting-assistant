import { Injectable, InternalServerErrorException, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  azureStorageConfiguration,
  isAzureStorageConfigured,
} from '../common/config/azure.config';
import {
  BlobSASPermissions,
  BlobServiceClient,
  ContainerClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';

@Injectable()
export class BlobStorageService {
  private readonly logger = new Logger(BlobStorageService.name);

  private readonly containerName: string;
  private readonly containerClient: ContainerClient;

  private readonly sharedKeyCredential: StorageSharedKeyCredential | null;

  constructor(
    @Inject(azureStorageConfiguration.KEY)
    azureConfig: ConfigType<typeof azureStorageConfiguration>,
  ) {
    this.containerName = azureConfig.containerName;

    if (!isAzureStorageConfigured(azureConfig)) {
      throw new InternalServerErrorException(
        'Azure Blob Storage is not configured. Provide AZURE_STORAGE_CONNECTION_STRING or (AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY).',
      );
    }

    let blobServiceClient: BlobServiceClient;

    if (azureConfig.connectionString) {
      blobServiceClient = BlobServiceClient.fromConnectionString(
        azureConfig.connectionString,
      );
    } else {
      const accountName = azureConfig.accountName!;
      const accountKey = azureConfig.accountKey!;
      const credential = new StorageSharedKeyCredential(accountName, accountKey);
      blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential,
      );
    }

    this.sharedKeyCredential =
      azureConfig.accountName && azureConfig.accountKey
        ? new StorageSharedKeyCredential(
            azureConfig.accountName,
            azureConfig.accountKey,
          )
        : null;

    this.containerClient = blobServiceClient.getContainerClient(this.containerName);

    this.containerClient
      .createIfNotExists()
      .then(() => this.logger.log(`Azure container ready: ${this.containerName}`))
      .catch((err) =>
        this.logger.error(`Failed to init container: ${this.containerName}`, err),
      );
  }

  getContainerName(): string {
    return this.containerName;
  }

  async uploadBuffer(
    blobName: string,
    buffer: Buffer,
    options?: { contentType?: string },
  ): Promise<void> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: options?.contentType
        ? { blobContentType: options.contentType }
        : undefined,
    });
  }

  async downloadToTempFile(
    blobName: string,
  ): Promise<{ filePath: string; cleanup: () => Promise<void> }> {
    const blobClient = this.containerClient.getBlobClient(blobName);

    const tempFilePath = path.join(os.tmpdir(), `meeting-audio-${Date.now()}-${path.basename(blobName)}`);

    const response = await blobClient.download();
    const readable = response.readableStreamBody;
    if (!readable) {
      throw new InternalServerErrorException(
        `Failed to download blob stream for ${blobName}`,
      );
    }

    await pipeline(readable, fs.createWriteStream(tempFilePath));

    return {
      filePath: tempFilePath,
      cleanup: async () => {
        try {
          await fs.promises.unlink(tempFilePath);
        } catch {
          // ignore
        }
      },
    };
  }

  /**
   * Returns a read-only SAS URL for a blob.
   * Requires AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY.
   */
  getReadSasUrl(blobName: string, expiresInMinutes = 60): string {
    if (!this.sharedKeyCredential) {
      throw new InternalServerErrorException(
        'Cannot generate SAS URL without AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY.',
      );
    }

    const blobClient = this.containerClient.getBlobClient(blobName);

    const startsOn = new Date();
    // small clock-skew buffer
    startsOn.setMinutes(startsOn.getMinutes() - 2);

    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);

    const sas = generateBlobSASQueryParameters(
      {
        containerName: this.containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),
        startsOn,
        expiresOn,
      },
      this.sharedKeyCredential,
    ).toString();

    return `${blobClient.url}?${sas}`;
  }

  /**
   * Deletes a blob from the container.
   * Uses deleteIfExists so it is safe to call even when the blob no longer
   * exists (e.g. it was already cleaned up after transcription).
   */
  async deleteBlob(blobName: string): Promise<void> {
    const blobClient = this.containerClient.getBlobClient(blobName);
    const { succeeded } = await blobClient.deleteIfExists();
    if (succeeded) {
      this.logger.log(`Blob deleted: ${blobName}`);
    } else {
      this.logger.warn(`Blob not found (already deleted?): ${blobName}`);
    }
  }
}
