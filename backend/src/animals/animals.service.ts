import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Animal } from './animal.entity';
import { PaginatedResult } from '../common/paginated-result.interface';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { S3Service } from '../s3/s3.service';
export { Animal } from './animal.entity';

const ANIMALS_INDEX = 'animals';

@Injectable()
export class AnimalsService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    private readonly meilisearchService: MeilisearchService,
    private readonly s3Service: S3Service,
  ) {}

  async getAnimals(
    userId: number,
    page?: number,
    limit?: number,
    breed?: string,
  ): Promise<Animal[] | PaginatedResult<Animal>> {
    const where = breed ? { userId, breed: ILike(`%${breed}%`) } : { userId };
    if (!page && !limit) {
      return this.animalRepository.find({
        where,
        order: { id: 'ASC' },
      });
    }
    const currentPage = page && page > 0 ? page : 1;
    const pageSize = limit && limit > 0 ? limit : 20;
    const [data, total] = await this.animalRepository.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    });
    return { data, page: currentPage, limit: pageSize, total };
  }

  async search(userId: number, q: string): Promise<Animal[]> {
    if (!q) {
      return [];
    }
    const hits = await this.meilisearchService.search<Animal>(
      ANIMALS_INDEX,
      q,
      {
        limit: 10,
        filter: `userId = ${userId}`,
      },
    );
    if (hits !== null) {
      return hits;
    }
    return this.animalRepository.find({
      where: [
        { userId, name: ILike(`%${q}%`) },
        { userId, breed: ILike(`%${q}%`) },
      ],
      take: 10,
    });
  }

  async getAnimalById(userId: number, id: string): Promise<Animal> {
    const animal = await this.animalRepository.findOneBy({
      id: parseInt(id, 10),
      userId,
    });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    return animal;
  }

  async uploadPhoto(file: Express.Multer.File): Promise<string> {
    const result = await this.s3Service.uploadFile(file.buffer, {
      folder: 'animals',
      contentType: file.mimetype,
    });
    return result.url;
  }

  async addAnimal(
    userId: number,
    data: Omit<Animal, 'id' | 'userId'>,
  ): Promise<Animal> {
    if (!data.name || !data.breed) {
      throw new BadRequestException('Name and Breed are required');
    }
    const newAnimal = this.animalRepository.create({ ...data, userId });
    const saved = await this.animalRepository.save(newAnimal);
    await this.meilisearchService.indexDocument(ANIMALS_INDEX, { ...saved });
    return saved;
  }

  async updateAnimal(
    userId: number,
    id: string,
    data: Partial<Omit<Animal, 'id' | 'userId'>>,
  ): Promise<Animal> {
    const animal = await this.getOwnedAnimal(userId, id);
    Object.assign(animal, data);
    const saved = await this.animalRepository.save(animal);
    await this.meilisearchService.indexDocument(ANIMALS_INDEX, { ...saved });
    return saved;
  }

  async deleteAnimal(userId: number, id: string): Promise<void> {
    const animal = await this.getOwnedAnimal(userId, id);
    await this.animalRepository.remove(animal);
    await this.meilisearchService.deleteDocument(ANIMALS_INDEX, id);
  }

  private async getOwnedAnimal(userId: number, id: string): Promise<Animal> {
    const animal = await this.animalRepository.findOneBy({
      id: parseInt(id, 10),
      userId,
    });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    return animal;
  }
}
