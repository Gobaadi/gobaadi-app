import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './faq.entity';
import { CreateFaqDto } from './dto/create-faq.dto';

@Injectable()
export class FaqsService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>,
  ) {}

  async list(category?: string): Promise<Faq[]> {
    const where = category ? { category } : {};
    return this.faqRepository.find({
      where,
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async getById(id: number): Promise<Faq> {
    const faq = await this.faqRepository.findOneBy({ id });
    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }
    return faq;
  }

  async create(dto: CreateFaqDto): Promise<Faq> {
    return this.faqRepository.save(this.faqRepository.create(dto));
  }

  async update(id: number, dto: Partial<CreateFaqDto>): Promise<Faq> {
    const faq = await this.faqRepository.findOneBy({ id });
    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }
    Object.assign(faq, dto);
    return this.faqRepository.save(faq);
  }

  async remove(id: number): Promise<void> {
    const faq = await this.faqRepository.findOneBy({ id });
    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }
    await this.faqRepository.remove(faq);
  }
}
