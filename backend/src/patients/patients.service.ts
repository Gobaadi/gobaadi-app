import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, ILike, Repository } from 'typeorm';
import { Animal } from '../animals/animal.entity';
import { User } from '../users/user.entity';
import { PaginatedResult } from '../common/paginated-result.interface';

export interface PatientWithOwner extends Animal {
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
}

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(
    page?: number,
    limit?: number,
    search?: string,
  ): Promise<PaginatedResult<PatientWithOwner>> {
    const currentPage = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;

    const animalWhere = search
      ? [{ name: ILike(`%${search}%`) }, { breed: ILike(`%${search}%`) }]
      : {};

    const [animals, total] = await this.animalRepository.findAndCount({
      where: animalWhere,
      order: { id: 'ASC' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });

    const ownerIds = [
      ...new Set(animals.map((a) => a.userId).filter(Boolean)),
    ] as number[];
    const owners =
      ownerIds.length > 0
        ? await this.userRepository.find({ where: { id: In(ownerIds) } })
        : [];
    const ownersById = new Map(owners.map((o) => [o.id, o]));

    const data: PatientWithOwner[] = animals.map((animal) => ({
      ...animal,
      ownerName: animal.userId
        ? ownersById.get(animal.userId)?.name
        : undefined,
      ownerPhone: animal.userId
        ? ownersById.get(animal.userId)?.phone
        : undefined,
      ownerEmail: animal.userId
        ? ownersById.get(animal.userId)?.email
        : undefined,
    }));

    return { data, page: currentPage, limit: pageSize, total };
  }

  async findOne(id: number): Promise<PatientWithOwner> {
    const animal = await this.animalRepository.findOneBy({ id });
    if (!animal) {
      throw new NotFoundException('Patient not found');
    }

    const owner = animal.userId
      ? await this.userRepository.findOneBy({ id: animal.userId })
      : null;

    return {
      ...animal,
      ownerName: owner?.name,
      ownerPhone: owner?.phone,
      ownerEmail: owner?.email,
    };
  }
}
