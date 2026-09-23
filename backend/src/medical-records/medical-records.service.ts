import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { Queue } from 'bullmq';
import { Attachment, AttachmentStatus } from './attachment.entity';
import { S3Service } from '../s3/s3.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/dicom',
  'application/octet-stream',
];

@Injectable()
export class MedicalRecordsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    private readonly s3Service: S3Service,
    @InjectQueue('file-processing-queue')
    private readonly fileProcessingQueue: Queue,
  ) {}

  async createFromUpload(
    file: Express.Multer.File,
    patientId: number,
    uploadedByUserId: number,
    appointmentId?: number,
  ): Promise<Attachment> {
    const uploadResult = await this.s3Service.uploadFile(file.buffer, {
      folder: 'medical-records',
      contentType: file.mimetype,
    });

    const attachment = this.attachmentRepository.create({
      patientId,
      appointmentId: appointmentId ?? null,
      uploadedByUserId,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      storageUrl: uploadResult.url,
      storagePublicId: uploadResult.key,
      status: AttachmentStatus.UPLOADED,
    });
    const saved = await this.attachmentRepository.save(attachment);

    try {
      await this.fileProcessingQueue.add(
        'process-attachment',
        { attachmentId: saved.id, mimeType: saved.mimeType },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );
    } catch (err) {
      console.warn('Failed to enqueue file processing job', err);
    }

    return saved;
  }

  async findForPatient(patientId: number): Promise<Attachment[]> {
    return this.attachmentRepository.find({
      where: { patientId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Attachment> {
    const attachment = await this.attachmentRepository.findOneBy({ id });
    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }
    return attachment;
  }

  async markProcessing(id: number): Promise<void> {
    await this.attachmentRepository.update(id, {
      status: AttachmentStatus.PROCESSING,
    });
  }

  async markReady(id: number): Promise<void> {
    await this.attachmentRepository.update(id, {
      status: AttachmentStatus.READY,
    });
  }

  async markFailed(id: number, reason: string): Promise<void> {
    await this.attachmentRepository.update(id, {
      status: AttachmentStatus.FAILED,
      failureReason: reason,
    });
  }

  isMimeTypeAllowed(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.includes(mimeType);
  }
}
