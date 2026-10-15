import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medicine } from './medicine.entity';

@Injectable()
export class MedicinesService {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepository: Repository<Medicine>,
  ) {}

  async search(query?: string): Promise<Medicine[]> {
    const qb = this.medicineRepository
      .createQueryBuilder('medicine')
      .orderBy('medicine.sortOrder', 'ASC')
      .addOrderBy('medicine.name', 'ASC')
      .take(20);

    const q = query?.trim();
    if (q) {
      qb.where('medicine.name ILIKE :q OR medicine.type ILIKE :q', {
        q: `%${q.replace(/[%_]/g, '\\$&')}%`,
      });
    }

    return qb.getMany();
  }
}
