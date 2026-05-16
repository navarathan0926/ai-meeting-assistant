# Phase 3 — Cloud Storage

## Phase Overview
Move audio file storage from local to cloud using AWS S3.

## Goals
- Store uploaded audio files in AWS S3.
- Generate signed URLs for secure access.

## Architecture/Design
- **Flow**:
  ```
  Frontend
      ↓
  Backend
      ↓
  AWS S3
  ```
- **AWS Setup**:
  - Create an S3 bucket.
  - Configure permissions and policies.

## Key Components
- AWS S3 bucket.
- File upload logic.
- Signed URL generation.

## Implementation Steps
1. **AWS S3 Setup**:
   - Create an S3 bucket.
   - Configure permissions and policies.
2. **File Upload**:
   - Update the file upload API to store files in S3.
   - Use the AWS SDK for integration.
3. **Signed URLs**:
   - Generate signed URLs for secure file access.
   - Return signed URLs in API responses.

## Technologies & Tools
- **Cloud**: AWS S3.
- **Backend**: AWS SDK, NestJS.

## Dependencies
- Phase 1: File upload API must be functional.

## Verification Checklist
- [ ] S3 bucket is configured correctly.
- [ ] Files are uploaded to S3.
- [ ] Signed URLs provide secure access.

## Further Considerations
- Monitor S3 storage costs.
- Plan for file lifecycle management.
- Ensure compliance with data privacy regulations.