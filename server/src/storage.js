import { BlobServiceClient } from '@azure/storage-blob';

export function createBlobStorage(container) {
  return {
    async upload({ blobName, bytes, contentType, sha256 }) {
      const properties = await container.getProperties();
      if (properties.blobPublicAccess) throw new Error('Story storage must be private');
      await container.getBlockBlobClient(blobName).uploadData(bytes, {
        conditions: { ifNoneMatch: '*' },
        metadata: { sha256 },
        blobHTTPHeaders: { blobContentType: contentType, blobContentDisposition: 'attachment' },
      });
    },
    async remove(blobName) {
      await container.getBlockBlobClient(blobName).deleteIfExists();
    },
  };
}

export function createAzureStorage(config) {
  if (!config.AZURE_STORAGE_CONNECTION_STRING) return undefined;
  const service = BlobServiceClient.fromConnectionString(config.AZURE_STORAGE_CONNECTION_STRING);
  return createBlobStorage(service.getContainerClient(config.AZURE_STORAGE_CONTAINER));
}
