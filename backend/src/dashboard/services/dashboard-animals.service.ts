import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Animal } from '../../animals/animal.entity';
import { User } from '../../users/user.entity';

export interface AnimalOwner {
  name: string;
  tag: string;
  avatar: string | null;
}

export interface AnimalListItem {
  id: number;
  animalTag: string;
  animalName: string;
  category: string;
  avatar: string | null;
  age: string;
  breed: string;
  gender: string;
  liveWeight: string;
  price: string;
  vaccinationDate: string;
  doctorVisit: string;
  owner: AnimalOwner;
}

@Injectable()
export class DashboardAnimalsService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private buildItem(
    animal: Animal,
    owner: { name: string; avatar: string | null } | null,
  ): AnimalListItem {
    return {
      id: animal.id,
      animalTag: `#${animal.id}`,
      animalName: animal.name,
      category: 'N/A',
      avatar: animal.image ?? null,
      age: animal.age,
      breed: animal.breed,
      gender: 'N/A',
      liveWeight: animal.weight ? `${animal.weight}` : 'N/A',
      price: 'N/A',
      vaccinationDate: 'N/A',
      doctorVisit: 'N/A',
      owner: {
        name: owner?.name || 'N/A',
        tag: animal.userId ? `#${animal.userId}` : 'N/A',
        avatar: owner?.avatar || null,
      },
    };
  }

  private async buildOwners(
    animals: Animal[],
  ): Promise<Map<number, { name: string; avatar: string | null }>> {
    const userIds = [
      ...new Set(animals.map((a) => a.userId).filter(Boolean)),
    ] as number[];
    const map = new Map<number, { name: string; avatar: string | null }>();
    if (userIds.length === 0) {
      return map;
    }
    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      select: { id: true, name: true, avatar: true },
    });
    for (const user of users) {
      map.set(user.id, { name: user.name ?? '', avatar: user.avatar ?? null });
    }
    return map;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    filter?: string,
  ): Promise<{
    data: AnimalListItem[];
    meta: { page: number; limit: number; total: number; totalPage: number };
  }> {
    const currentPage = page > 0 ? page : 1;
    const pageSize = limit > 0 ? limit : 10;

    if (search) {
      const qb = this.animalRepository
        .createQueryBuilder('animal')
        .where(
          '(LOWER(animal.name) LIKE LOWER(:search) OR LOWER(animal.breed) LIKE LOWER(:search))',
          { search: `%${search}%` },
        );
      if (filter && filter !== 'all') {
        qb.andWhere('animal.breed = :filter', { filter });
      }
      qb.orderBy('animal.id', 'ASC')
        .skip((currentPage - 1) * pageSize)
        .take(pageSize);
      const [animals, total] = await qb.getManyAndCount();
      const owners = await this.buildOwners(animals);
      return {
        data: animals.map((a) =>
          this.buildItem(a, a.userId ? (owners.get(a.userId) ?? null) : null),
        ),
        meta: {
          page: currentPage,
          limit: pageSize,
          total,
          totalPage: Math.ceil(total / pageSize),
        },
      };
    }

    const repoWhere: Record<string, unknown> = {};
    if (filter && filter !== 'all') {
      repoWhere.breed = filter;
    }
    const [animals, total] = await this.animalRepository.findAndCount({
      where: repoWhere,
      order: { id: 'ASC' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });
    const owners = await this.buildOwners(animals);
    return {
      data: animals.map((a) =>
        this.buildItem(a, a.userId ? (owners.get(a.userId) ?? null) : null),
      ),
      meta: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPage: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: number): Promise<AnimalListItem> {
    const animal = await this.animalRepository.findOneBy({ id });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    const owners = await this.buildOwners([animal]);
    return this.buildItem(
      animal,
      animal.userId ? (owners.get(animal.userId) ?? null) : null,
    );
  }

  async remove(id: number): Promise<void> {
    const animal = await this.animalRepository.findOneBy({ id });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    await this.animalRepository.remove(animal);
  }
}
