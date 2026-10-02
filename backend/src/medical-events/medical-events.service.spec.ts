import { Repository, IsNull } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MedicalEventsService } from './medical-events.service';
import { MedicalEvent, MedicalEventType } from './medical-event.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Animal } from '../animals/animal.entity';

const animalRow = (id: number, userId: number | null): Animal =>
  ({ id, userId, name: 'Gau', breed: 'Gir' }) as Animal;

const eventRow = (id: number): MedicalEvent => ({ id }) as MedicalEvent;

const makeService = () => {
  const state = {
    animal: null as Animal | null,
    animalOwnerAppointments: [] as { id: number }[],
    treatedAppointment: null as Appointment | null,
    events: [] as MedicalEvent[],
    total: 0,
    appointmentWhere: undefined as unknown,
    eventWhere: undefined as Record<string, unknown> | undefined,
  };

  const medicalEventRepository = {
    findAndCount: jest.fn((args: { where: Record<string, unknown> }) => {
      state.eventWhere = args.where;
      return Promise.resolve([state.events, state.total] as const);
    }),
  };
  const appointmentRepository = {
    findOne: jest.fn(() => Promise.resolve(state.treatedAppointment)),
    find: jest.fn((args?: { where?: unknown }) => {
      state.appointmentWhere = args?.where;
      return Promise.resolve(state.animalOwnerAppointments);
    }),
  };
  const animalRepository = {
    findOneBy: jest.fn(() => Promise.resolve(state.animal)),
  };

  const service = new MedicalEventsService(
    medicalEventRepository as unknown as Repository<MedicalEvent>,
    appointmentRepository as unknown as Repository<Appointment>,
    animalRepository as unknown as Repository<Animal>,
  );

  return { service, state, medicalEventRepository };
};

describe('MedicalEventsService.listByAnimal', () => {
  it('404s when the animal does not exist', async () => {
    const { service } = makeService();

    await expect(service.listByAnimal(1, null, 999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("allows the animal's owner", async () => {
    const { service, state } = makeService();
    state.animal = animalRow(7, 42);
    state.animalOwnerAppointments = [{ id: 11 }];

    const result = await service.listByAnimal(42, null, 7);

    expect(result).toEqual({ data: [], page: 1, limit: 20, total: 0 });
  });

  it('rejects a doctor who never treated the animal or its owner', async () => {
    const { service, state } = makeService();
    state.animal = animalRow(7, 42);
    state.treatedAppointment = null;

    await expect(service.listByAnimal(99, 3, 7)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows a doctor with an appointment for the animal/its owner', async () => {
    const { service, state } = makeService();
    state.animal = animalRow(7, 42);
    state.treatedAppointment = { id: 5 } as Appointment;
    state.animalOwnerAppointments = [{ id: 11 }, { id: 12 }];
    state.events = [eventRow(101)];
    state.total = 1;

    const result = await service.listByAnimal(99, 3, 7);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('scopes events to this animal plus unattributed owner bookings', async () => {
    const { service, state, medicalEventRepository } = makeService();
    state.animal = animalRow(7, 42);
    state.animalOwnerAppointments = [{ id: 11 }];

    await service.listByAnimal(42, null, 7);

    expect(state.appointmentWhere).toEqual([
      { animalId: 7 },
      { patientId: 42, animalId: IsNull() },
    ]);
    expect(medicalEventRepository.findAndCount).toHaveBeenCalledTimes(1);
    const args = medicalEventRepository.findAndCount.mock.calls[0][0] as {
      where: Record<string, unknown>;
      order: unknown;
      skip: number;
      take: number;
    };
    expect(args.where.appointmentId).toBeDefined();
    expect(args.order).toEqual({ createdAt: 'DESC' });
    expect(args.skip).toBe(0);
    expect(args.take).toBe(20);
  });

  it('returns an empty page without querying events when the animal has no appointments', async () => {
    const { service, state, medicalEventRepository } = makeService();
    state.animal = animalRow(7, 42);
    state.animalOwnerAppointments = [];

    const result = await service.listByAnimal(42, null, 7);

    expect(result).toEqual({ data: [], page: 1, limit: 20, total: 0 });
    expect(medicalEventRepository.findAndCount).not.toHaveBeenCalled();
  });

  it('forwards the type filter', async () => {
    const { service, state } = makeService();
    state.animal = animalRow(7, 42);
    state.animalOwnerAppointments = [{ id: 11 }];

    await service.listByAnimal(42, null, 7, MedicalEventType.VACCINATION);

    expect(state.eventWhere).toMatchObject({
      type: MedicalEventType.VACCINATION,
    });
  });
});
