import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrescriptionsService } from './prescriptions.service';
import { Prescription } from './prescription.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Animal } from '../animals/animal.entity';
import { S3Service } from '../s3/s3.service';
import { NotificationsService } from '../notifications/notifications.service';

const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment =>
  ({
    id: 11,
    doctorId: 7,
    patientId: 42,
    animalId: 5,
    ...overrides,
  }) as Appointment;

const makeAnimal = (
  overrides: Partial<Animal> & { userId?: number | null } = {},
): Animal => ({ id: 5, userId: 42, ...overrides }) as Animal;

const makeService = () => {
  const state = {
    appointment: null as Appointment | null,
    animal: null as Animal | null,
    prescription: null as Prescription | null,
  };

  const prescriptionRepository = {
    findOneBy: jest.fn(() => Promise.resolve(state.prescription)),
    find: jest.fn(() => Promise.resolve([])),
    create: jest.fn((input: Partial<Prescription>) => input),
    save: jest.fn((input: Partial<Prescription>) =>
      Promise.resolve({ id: 99, ...input }),
    ),
  };
  const appointmentRepository = {
    findOneBy: jest.fn(() => Promise.resolve(state.appointment)),
  };
  const animalRepository = {
    findOneBy: jest.fn(() => Promise.resolve(state.animal)),
    find: jest.fn(() => Promise.resolve([])),
  };
  const notificationsService = {
    createNotification: jest.fn(() => Promise.resolve(undefined)),
  };

  const service = new PrescriptionsService(
    prescriptionRepository as unknown as Repository<Prescription>,
    appointmentRepository as unknown as Repository<Appointment>,
    animalRepository as unknown as Repository<Animal>,
    {} as S3Service,
    notificationsService as unknown as NotificationsService,
  );

  return {
    service,
    state,
    prescriptionRepository,
    animalRepository,
    notificationsService,
  };
};

describe('PrescriptionsService.create', () => {
  it('stores the doctors-row id (not the users id) on doctorId', async () => {
    const { service, state, prescriptionRepository } = makeService();
    state.appointment = makeAppointment();
    state.animal = makeAnimal();

    await service.create(7, { appointmentId: 11, medicines: [] });

    expect(prescriptionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 7, animalId: 5, ownerId: 42 }),
    );
    expect(prescriptionRepository.save).toHaveBeenCalled();
  });

  it('404s when the appointment does not exist', async () => {
    const { service, state } = makeService();
    state.appointment = null;

    await expect(
      service.create(7, { appointmentId: 999, medicines: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('403s when the caller is not the appointment doctor', async () => {
    const { service, state, prescriptionRepository } = makeService();
    state.appointment = makeAppointment({ doctorId: 3 });

    await expect(
      service.create(7, { appointmentId: 11, medicines: [] }),
    ).rejects.toThrow(ForbiddenException);
    expect(prescriptionRepository.save).not.toHaveBeenCalled();
  });

  it('404s when the resolved animal does not exist', async () => {
    const { service, state, animalRepository } = makeService();
    state.appointment = makeAppointment({
      animalId: null as unknown as number,
    });
    state.animal = null;
    animalRepository.find.mockResolvedValue([makeAnimal()] as never);

    await expect(
      service.create(7, { appointmentId: 11, medicines: [] }),
    ).rejects.toThrow(NotFoundException);
  });

  it('400s when the animal has no registered owner', async () => {
    const { service, state } = makeService();
    state.appointment = makeAppointment();
    state.animal = makeAnimal({ userId: null });

    await expect(
      service.create(7, { appointmentId: 11, medicines: [] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back to the owner-only animal when no animalId is provided', async () => {
    const { service, state, animalRepository } = makeService();
    state.appointment = makeAppointment({
      animalId: null as unknown as number,
    });
    state.animal = makeAnimal();
    animalRepository.find.mockResolvedValue([makeAnimal()] as never);

    await service.create(7, { appointmentId: 11, medicines: [] });

    expect(animalRepository.find).toHaveBeenCalledWith({
      where: { userId: 42 },
    });
  });
});

describe('PrescriptionsService.findByAppointmentId', () => {
  it('returns null when no prescription exists for the appointment', async () => {
    const { service, state } = makeService();
    state.prescription = null;

    await expect(service.findByAppointmentId(11, 42, 7)).resolves.toBeNull();
  });

  it('allows the appointment doctor (doctors.id)', async () => {
    const { service, state } = makeService();
    state.prescription = { id: 1, appointmentId: 11 } as Prescription;
    state.appointment = makeAppointment();

    await expect(service.findByAppointmentId(11, 999, 7)).resolves.toEqual(
      state.prescription,
    );
  });

  it('allows the owner (users.id)', async () => {
    const { service, state } = makeService();
    state.prescription = { id: 1, appointmentId: 11 } as Prescription;
    state.appointment = makeAppointment();

    await expect(service.findByAppointmentId(11, 42)).resolves.toEqual(
      state.prescription,
    );
  });

  it('403s for a stranger', async () => {
    const { service, state } = makeService();
    state.prescription = { id: 1, appointmentId: 11 } as Prescription;
    state.appointment = makeAppointment();

    await expect(service.findByAppointmentId(11, 1234, 99)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('PrescriptionsService.send', () => {
  it('marks the prescription sent and notifies the owner', async () => {
    const { service, state, notificationsService } = makeService();
    state.prescription = { id: 1, doctorId: 7, ownerId: 42 } as Prescription;

    const result = await service.send(1, 7);

    expect(result.sentAt).toBeInstanceOf(Date);
    expect(notificationsService.createNotification).toHaveBeenCalledWith(
      42,
      'Prescription ready',
      'Your prescription has been sent.',
      expect.anything(),
      'Prescription',
      '1',
    );
  });

  it('403s when the caller did not create the prescription', async () => {
    const { service, state } = makeService();
    state.prescription = { id: 1, doctorId: 7, ownerId: 42 } as Prescription;

    await expect(service.send(1, 3)).rejects.toThrow(ForbiddenException);
  });
});
