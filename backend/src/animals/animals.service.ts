import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Animal } from './animal.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Appointment } from '../appointments/appointment.entity';
import { PaginatedResult } from '../common/paginated-result.interface';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { S3Service } from '../s3/s3.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
export { Animal } from './animal.entity';

const ANIMALS_INDEX = 'animals';

/** Who is asking for an animal — used to decide owner vs. treating-doctor access. */
export interface AnimalRequester {
  userId: number;
}

@Injectable()
export class AnimalsService {
  constructor(
    @InjectRepository(Animal)
    private readonly animalRepository: Repository<Animal>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly meilisearchService: MeilisearchService,
    private readonly s3Service: S3Service,
    private readonly cloudinaryService: CloudinaryService,
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

  /**
   * Fetch an animal for read access. The owner always sees their own animal;
   * a doctor may also read an animal they have treated (an appointment linked
   * to the animal itself, or to the animal's owner when the booking carried no
   * animal id). Anything else 404s exactly like a missing id so callers cannot
   * probe which animals exist.
   */
  async getAnimalById(requester: AnimalRequester, id: string): Promise<Animal> {
    const animal = await this.animalRepository.findOneBy({
      id: parseInt(id, 10),
    });
    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
    if (animal.userId === requester.userId) {
      return animal;
    }
    if (await this.hasTreatedAnimal(requester.userId, animal)) {
      return animal;
    }
    throw new NotFoundException('Animal not found');
  }

  /** True when the requester has a doctor profile with an appointment for this animal or its owner. */
  private async hasTreatedAnimal(
    userId: number,
    animal: Animal,
  ): Promise<boolean> {
    const doctor = await this.doctorRepository.findOneBy({ userId });
    if (!doctor) {
      return false;
    }
    const where: FindOptionsWhere<Appointment>[] = [
      { doctorId: doctor.id, animalId: animal.id },
    ];
    if (typeof animal.userId === 'number') {
      where.push({ doctorId: doctor.id, patientId: animal.userId });
    }
    const appointment = await this.appointmentRepository.findOne({
      where,
    });
    return !!appointment;
  }

  async uploadPhoto(file: Express.Multer.File): Promise<string> {
    if (this.s3Service.isConfigured) {
      const result = await this.s3Service.uploadFile(file.buffer, {
        folder: 'animals',
        contentType: file.mimetype,
      });
      return result.url;
    }
    if (this.cloudinaryService.isConfigured) {
      const result = await this.cloudinaryService.uploadFile(file.buffer, {
        folder: 'animals',
        resourceType: 'image',
      });
      return result.url;
    }
    throw new InternalServerErrorException(
      'Image upload is not configured on this server',
    );
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
