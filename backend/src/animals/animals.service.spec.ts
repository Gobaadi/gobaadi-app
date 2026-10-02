import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

// The real service pulls in the meilisearch SDK, which ships untranspiled ESM
// that this jest setup does not transform — stub it out.
jest.mock('../meilisearch/meilisearch.service', () => ({
  MeilisearchService: class MeilisearchService {},
}));

import { AnimalsService } from './animals.service';
import { Animal } from './animal.entity';
import { Doctor } from '../doctors/doctor.entity';
import { Appointment } from '../appointments/appointment.entity';
import { MeilisearchService } from '../meilisearch/meilisearch.service';
import { S3Service } from '../s3/s3.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const animalRow = (id: number, userId: number | null): Animal =>
  ({ id, userId, name: 'Gau', breed: 'Gir' }) as Animal;

const makeService = () => {
  const state = {
    animal: null as Animal | null,
    doctor: null as Doctor | null,
    appointment: null as Appointment | null,
  };

  const animalRepository = {
    findOneBy: jest.fn(() => Promise.resolve(state.animal)),
  };
  const doctorRepository = {
    findOneBy: jest.fn(() => Promise.resolve(state.doctor)),
  };
  const appointmentRepository = {
    findOne: jest.fn(() => Promise.resolve(state.appointment)),
  };

  const service = new AnimalsService(
    animalRepository as unknown as Repository<Animal>,
    doctorRepository as unknown as Repository<Doctor>,
    appointmentRepository as unknown as Repository<Appointment>,
    {} as MeilisearchService,
    {} as S3Service,
    {} as CloudinaryService,
  );

  return { service, state, appointmentRepository, doctorRepository };
};

describe('AnimalsService.getAnimalById', () => {
  it('returns the animal to its owner', async () => {
    const { service, state } = makeService();
    state.animal = animalRow(7, 42);

    await expect(service.getAnimalById({ userId: 42 }, '7')).resolves.toEqual(
      state.animal,
    );
  });

  it('returns the animal to a doctor with an appointment for that animal', async () => {
    const { service, state } = makeService();
    state.animal = animalRow(7, 42);
    state.doctor = { id: 3, userId: 99 } as Doctor;
    state.appointment = { id: 11 } as Appointment;

    await expect(service.getAnimalById({ userId: 99 }, '7')).resolves.toEqual(
      state.animal,
    );
  });

  it('treats an owner-linked booking (no animal id) as evidence of treatment', async () => {
    const { service, state, appointmentRepository } = makeService();
    state.animal = animalRow(7, 42);
    state.doctor = { id: 3, userId: 99 } as Doctor;
    state.appointment = { id: 11 } as Appointment;

    await service.getAnimalById({ userId: 99 }, '7');

    expect(appointmentRepository.findOne).toHaveBeenCalledWith({
      where: [
        { doctorId: 3, animalId: 7 },
        { doctorId: 3, patientId: 42 },
      ],
    });
  });

  it('404s for a stranger who has no doctor profile', async () => {
    const { service, state, doctorRepository } = makeService();
    state.animal = animalRow(7, 42);
    state.doctor = null;

    await expect(service.getAnimalById({ userId: 1234 }, '7')).rejects.toThrow(
      NotFoundException,
    );
    expect(doctorRepository.findOneBy).toHaveBeenCalledWith({ userId: 1234 });
  });

  it('404s for a doctor who never treated the animal or its owner', async () => {
    const { service, state } = makeService();
    state.animal = animalRow(7, 42);
    state.doctor = { id: 3, userId: 99 } as Doctor;
    state.appointment = null;

    await expect(service.getAnimalById({ userId: 99 }, '7')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('404s when the animal does not exist', async () => {
    const { service, state } = makeService();
    state.animal = null;

    await expect(service.getAnimalById({ userId: 42 }, '999')).rejects.toThrow(
      NotFoundException,
    );
  });
});
