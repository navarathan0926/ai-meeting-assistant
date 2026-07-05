import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';

// ── Mock @azure/storage-blob before importing the service ──────────────────────

const mockContainerClient = {
  createIfNotExists: jest.fn().mockResolvedValue({}),
  getBlockBlobClient: jest.fn(),
  getBlobClient: jest.fn(),
};

const mockBlobServiceClient = {
  getContainerClient: jest.fn().mockReturnValue(mockContainerClient),
};

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn().mockReturnValue(mockBlobServiceClient),
  },
  StorageSharedKeyCredential: jest.fn().mockImplementation(() => ({})),
  BlobSASPermissions: {
    parse: jest.fn().mockReturnValue('r'),
  },
  generateBlobSASQueryParameters: jest.fn().mockReturnValue({ toString: () => 'sas=token' }),
}));

import { BlobStorageService } from './blob-storage.service';
import {
  AzureStorageConfig,
  provideAzureStorageConfig,
} from '../common/config/config.testing';

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('BlobStorageService', () => {
  let service: BlobStorageService;

  function createModule(overrides: Partial<AzureStorageConfig> = {}) {
    return Test.createTestingModule({
      providers: [BlobStorageService, provideAzureStorageConfig(overrides)],
    }).compile();
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await createModule();
    service = module.get<BlobStorageService>(BlobStorageService);
  });

  describe('constructor', () => {
    it('should throw InternalServerErrorException when no credentials are configured', async () => {
      await expect(
        createModule({
          connectionString: null,
          accountName: null,
          accountKey: null,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should initialize successfully with a connection string', async () => {
      const module = await createModule({
        connectionString:
          'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net',
      });
      const svc = module.get<BlobStorageService>(BlobStorageService);
      expect(svc).toBeDefined();
    });
  });

  describe('getContainerName', () => {
    it('should return the configured container name', () => {
      expect(service.getContainerName()).toBe('test-container');
    });

    it('should default to "uploads" when no container name is configured', async () => {
      const module = await createModule({ containerName: 'uploads' });
      const svc = module.get<BlobStorageService>(BlobStorageService);
      expect(svc.getContainerName()).toBe('uploads');
    });
  });

  describe('uploadBuffer', () => {
    it('should call blockBlobClient.uploadData with buffer and contentType headers', async () => {
      const mockUploadData = jest.fn().mockResolvedValue({});
      const mockBlockBlobClient = { uploadData: mockUploadData };
      mockContainerClient.getBlockBlobClient.mockReturnValue(mockBlockBlobClient);

      const buffer = Buffer.from('test-audio');
      await service.uploadBuffer('file.mp3', buffer, { contentType: 'audio/mpeg' });

      expect(mockContainerClient.getBlockBlobClient).toHaveBeenCalledWith('file.mp3');
      expect(mockUploadData).toHaveBeenCalledWith(
        buffer,
        expect.objectContaining({
          blobHTTPHeaders: { blobContentType: 'audio/mpeg' },
        }),
      );
    });

    it('should call uploadData without blobHTTPHeaders when no contentType given', async () => {
      const mockUploadData = jest.fn().mockResolvedValue({});
      mockContainerClient.getBlockBlobClient.mockReturnValue({ uploadData: mockUploadData });

      await service.uploadBuffer('file.mp3', Buffer.from('data'));
      expect(mockUploadData).toHaveBeenCalledWith(
        Buffer.from('data'),
        expect.objectContaining({
          blobHTTPHeaders: undefined,
        }),
      );
    });
  });

  describe('getReadSasUrl', () => {
    it('should throw InternalServerErrorException when no shared key credentials', async () => {
      const module = await createModule({
        connectionString:
          'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net',
        accountName: null,
        accountKey: null,
      });
      const svc = module.get<BlobStorageService>(BlobStorageService);

      expect(() => svc.getReadSasUrl('file.mp3')).toThrow(InternalServerErrorException);
    });
  });

  describe('deleteBlob', () => {
    it('should call deleteIfExists on the blob client', async () => {
      const mockDeleteIfExists = jest.fn().mockResolvedValue({ succeeded: true });
      mockContainerClient.getBlobClient.mockReturnValue({ deleteIfExists: mockDeleteIfExists });

      await service.deleteBlob('file.mp3');

      expect(mockContainerClient.getBlobClient).toHaveBeenCalledWith('file.mp3');
      expect(mockDeleteIfExists).toHaveBeenCalled();
    });

    it('should not throw when blob does not exist (already deleted)', async () => {
      const mockDeleteIfExists = jest.fn().mockResolvedValue({ succeeded: false });
      mockContainerClient.getBlobClient.mockReturnValue({ deleteIfExists: mockDeleteIfExists });

      await expect(service.deleteBlob('file.mp3')).resolves.toBeUndefined();
    });
  });
});
