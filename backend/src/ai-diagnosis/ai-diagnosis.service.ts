import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AiDiagnosis, AiDiagnosisStatus } from './ai-diagnosis.entity';
import { CreateAiDiagnosisDto } from './dto/create-ai-diagnosis.dto';
import { S3Service } from '../s3/s3.service';
import { DiagnosisResult } from './ai-diagnosis-analyzer.service';

@Injectable()
export class AiDiagnosisService {
  constructor(
    @InjectRepository(AiDiagnosis)
    private readonly aiDiagnosisRepository: Repository<AiDiagnosis>,
    @InjectQueue('ai-diagnosis-queue')
    private readonly aiDiagnosisQueue: Queue,
    private readonly s3Service: S3Service,
  ) {}

  async analyze(
    userId: number,
    dto: CreateAiDiagnosisDto,
  ): Promise<AiDiagnosis> {
    const diagnosis = this.aiDiagnosisRepository.create({
      userId,
      images: dto.images ?? [],
      symptoms: dto.symptoms,
      status: AiDiagnosisStatus.PENDING,
      recommendations: [],
      recommendedDoctorIds: [],
    });
    const saved = await this.aiDiagnosisRepository.save(diagnosis);

    try {
      await this.aiDiagnosisQueue.add('analyze-diagnosis', {
        diagnosisId: saved.id,
        userId,
        images: saved.images,
        symptoms: saved.symptoms,
      });
    } catch (err) {
      console.warn('Failed to enqueue AI diagnosis job', err);
    }

    return saved;
  }

  async applyResult(id: number, result: DiagnosisResult): Promise<void> {
    await this.aiDiagnosisRepository.update(id, {
      status: AiDiagnosisStatus.READY,
      analysisResult: result.analysisResult,
      confidenceScore: result.confidenceScore,
      recommendations: result.recommendations,
      recommendedDoctorIds: result.recommendedDoctorIds,
    });
  }

  async markFailed(id: number, reason: string): Promise<void> {
    await this.aiDiagnosisRepository.update(id, {
      status: AiDiagnosisStatus.FAILED,
      failureReason: reason,
    });
  }

  async getById(id: number, userId: number): Promise<AiDiagnosis> {
    const diagnosis = await this.aiDiagnosisRepository.findOneBy({ id });
    if (!diagnosis) {
      throw new NotFoundException('Diagnosis not found');
    }
    if (diagnosis.userId !== userId) {
      throw new ForbiddenException('You do not own this diagnosis');
    }
    return diagnosis;
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const result = await this.s3Service.uploadFile(file.buffer, {
      folder: 'ai-diagnosis',
      contentType: file.mimetype,
    });
    return result.url;
  }

  async getHistory(userId: number): Promise<AiDiagnosis[]> {
    return this.aiDiagnosisRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
