# Phase 3 — Cloud Storage

## Phase Overview

Move audio file storage from local to cloud using Azure Blob Storage.

## Goals

- Store uploaded audio files in Azure Blob Storage.
- Generate signed URLs (SAS) for secure access.

## Architecture/Design

- **Flow**:
  ```
  Frontend
      ↓
  Backend
      ↓
   Azure Blob Storage
  ```
- **Azure Setup**:
  - Create a Storage Account.
  - Create a Blob Container (e.g., `uploads`).
  - Configure access via Azure AD (preferred) or a connection string.

## Key Components

- Azure Storage Account + Blob Container.
- File upload logic.
- Signed URL (SAS) generation.

## Implementation Steps

1. **Azure Blob Storage Setup**:
   - Create a Storage Account.
   - Create a Blob Container.
   - Decide auth method:
     - Azure AD / Managed Identity (recommended for production).
     - Connection string (simpler for local dev).
2. **File Upload**:
   - Update the file upload API to store files in Blob Storage.
   - Use the Azure Storage SDK for integration.
3. **Signed URLs (SAS)**:
   - Generate SAS URLs for secure, time-limited file access.
   - Return SAS URLs in API responses.

## Technologies & Tools

- **Cloud**: Azure Blob Storage.
- **Backend**: Azure Storage SDK, NestJS.

## Dependencies

- Phase 1: File upload API must be functional.

## Verification Checklist

- [x] Storage Account + Blob Container are configured correctly.
- [x] Files are uploaded to Blob Storage.
- [x] SAS URLs provide secure access.

## Further Considerations

- Monitor Blob Storage costs.
- Plan for file lifecycle management.
- Ensure compliance with data privacy regulations.
