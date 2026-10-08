import { FindOptionsWhere, Repository } from 'typeorm';
import { DiscountsService } from './discounts.service';
import { PatientDiscount } from './patient-discount.entity';
import { Discount } from './discount.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Animal } from '../animals/animal.entity';
import { UsersService } from '../users/users.service';

interface AppointmentRow {
  animalId: number | null;
  patientId: number;
  startAt?: Date;
  id?: number;
}

interface AnimalRow {
  id: number;
  userId?: number | null;
  name: string;
  breed: string;
  weight: string;
  age: string;
  color: string;
  image?: string;
}

interface DiscountRow {
  doctorId: number;
  patientId: number;
  percent: number;
  isActive: boolean;
}

interface UserRow {
  id: number;
  name: string;
  avatar?: string | null;
}

interface State {
  appointments: AppointmentRow[];
  animals: AnimalRow[];
  discounts: DiscountRow[];
  users: Record<number, UserRow>;
  animalWhere: FindOptionsWhere<Animal>[] | undefined;
}

const owner = (
  id: number,
  name: string,
  avatar: string | null = null,
): UserRow => ({
  id,
  name,
  avatar,
});

const animal = (id: number, userId: number, name: string): AnimalRow => ({
  id,
  userId,
  name,
  breed: 'Gir',
  weight: '200',
  age: '2',
  color: 'brown',
});

const makeService = () => {
  const state: State = {
    appointments: [],
    animals: [],
    discounts: [],
    users: {},
    animalWhere: undefined,
  };

  const discountRepository = {
    find: jest.fn((): Promise<DiscountRow[]> =>
      Promise.resolve(state.discounts),
    ),
  };
  const promoDiscountRepository = {
    find: jest.fn((): Promise<Discount[]> => Promise.resolve([])),
  };
  const appointmentRepository = {
    find: jest.fn((): Promise<AppointmentRow[]> =>
      Promise.resolve(state.appointments),
    ),
  };
  const animalRepository = {
    find: jest.fn(
      (args?: { where?: FindOptionsWhere<Animal>[] }): Promise<AnimalRow[]> => {
        state.animalWhere = args?.where;
        return Promise.resolve(state.animals);
      },
    ),
  };
  const usersService = {
    findById: jest.fn((id: number): Promise<UserRow | null> =>
      Promise.resolve(state.users[id] ?? null),
    ),
  };

  const service = new DiscountsService(
    discountRepository as unknown as Repository<PatientDiscount>,
    promoDiscountRepository as unknown as Repository<Discount>,
    appointmentRepository as unknown as Repository<Appointment>,
    animalRepository as unknown as Repository<Animal>,
    usersService as unknown as UsersService,
  );

  return { service, state, animalRepository };
};

describe('DiscountsService.getDoctorPatients', () => {
  it('returns an empty list when the doctor has no appointments', async () => {
    const { service } = makeService();
    await expect(service.getDoctorPatients(1)).resolves.toEqual([]);
  });

  it('returns the animal linked through appointments.animalId', async () => {
    const { service, state, animalRepository } = makeService();
    state.appointments = [{ animalId: 5, patientId: 7 }];
    state.animals = [animal(5, 9, 'Gir cow')];
    state.users = { 9: owner(9, 'Karim') };

    const patients = await service.getDoctorPatients(1);

    expect(patients).toHaveLength(1);
    expect(patients[0].name).toBe('Gir cow');
    expect(patients[0].ownerName).toBe('Karim');
    expect(patients[0].ownerOnly).toBeUndefined();
    // Both the appointment's animalId and the booking owner constrain the query.
    expect(state.animalWhere).toHaveLength(2);
    expect(animalRepository.find).toHaveBeenCalledTimes(1);
  });

  it('falls back to every animal of the booking owner when animalId is null', async () => {
    const { service, state, animalRepository } = makeService();
    state.appointments = [{ animalId: null, patientId: 7 }];
    state.animals = [animal(1, 7, 'Pakhi'), animal(2, 7, 'Rani')];
    state.users = { 7: owner(7, 'Rahim') };

    const patients = await service.getDoctorPatients(1);

    expect(patients.map((p) => p.name)).toEqual(['Pakhi', 'Rani']);
    expect(patients.every((p) => p.ownerName === 'Rahim')).toBe(true);
    expect(state.animalWhere).toHaveLength(1);
    expect(
      'userId' in (state.animalWhere as FindOptionsWhere<Animal>[])[0],
    ).toBe(true);
    expect(animalRepository.find).toHaveBeenCalledTimes(1);
  });

  it('returns an owner row when the booking owner has no animals', async () => {
    const { service, state } = makeService();
    state.appointments = [{ animalId: null, patientId: 7 }];
    state.animals = [];
    state.users = { 7: owner(7, 'Rahim', 'https://example.com/a.jpg') };

    const patients = await service.getDoctorPatients(1);

    expect(patients).toHaveLength(1);
    expect(patients[0]).toMatchObject({
      id: 7,
      name: 'Rahim',
      ownerOnly: true,
      ownerName: 'Rahim',
      image: 'https://example.com/a.jpg',
    });
  });

  it('does not add an owner row when the owner already has animals', async () => {
    const { service, state } = makeService();
    state.appointments = [{ animalId: null, patientId: 7 }];
    state.animals = [animal(1, 7, 'Pakhi')];
    state.users = { 7: owner(7, 'Rahim') };

    const patients = await service.getDoctorPatients(1);

    expect(patients).toHaveLength(1);
    expect(patients[0].ownerOnly).toBeUndefined();
  });

  it('attaches active discounts to their animal', async () => {
    const { service, state } = makeService();
    state.appointments = [{ animalId: 5, patientId: 7 }];
    state.animals = [animal(5, 7, 'Gir cow'), animal(6, 7, 'Other')];
    state.users = { 7: owner(7, 'Rahim') };
    state.discounts = [
      { doctorId: 1, patientId: 5, percent: 10, isActive: true },
    ];

    const patients = await service.getDoctorPatients(1);

    expect(patients.find((p) => p.id === 5)?.discount?.percent).toBe(10);
    expect(patients.find((p) => p.id === 6)?.discount).toBeUndefined();
  });

  it('searches across animal names and owner names', async () => {
    const { service, state } = makeService();
    state.appointments = [
      { animalId: 5, patientId: 7 },
      { animalId: null, patientId: 8 },
    ];
    state.animals = [animal(5, 7, 'Gir cow')];
    state.users = { 7: owner(7, 'Karim'), 8: owner(8, 'Rahim') };

    await expect(service.getDoctorPatients(1, 'gir')).resolves.toHaveLength(1);
    await expect(service.getDoctorPatients(1, 'rah')).resolves.toHaveLength(1);
    await expect(service.getDoctorPatients(1, 'kar')).resolves.toHaveLength(1);
    await expect(service.getDoctorPatients(1, 'nomatch')).resolves.toHaveLength(
      0,
    );
  });

  it('keeps only discounted rows when discountGiven is true', async () => {
    const { service, state } = makeService();
    state.appointments = [
      { animalId: 5, patientId: 7 },
      { animalId: 6, patientId: 8 },
    ];
    state.animals = [animal(5, 7, 'Gir cow'), animal(6, 8, 'Desi cow')];
    state.users = { 7: owner(7, 'Karim'), 8: owner(8, 'Rahim') };
    state.discounts = [
      { doctorId: 1, patientId: 5, percent: 10, isActive: true },
    ];

    const discounted = await service.getDoctorPatients(1, undefined, true);
    expect(discounted.map((p) => p.id)).toEqual([5]);

    const undiscounted = await service.getDoctorPatients(1, undefined, false);
    expect(undiscounted.map((p) => p.id)).toEqual([6]);
  });

  it('excludes owner-only rows from the discounted filter', async () => {
    const { service, state } = makeService();
    state.appointments = [{ animalId: null, patientId: 7 }];
    state.animals = [];
    state.users = { 7: owner(7, 'Rahim') };

    const discounted = await service.getDoctorPatients(1, undefined, true);
    expect(discounted).toEqual([]);

    const undiscounted = await service.getDoctorPatients(1, undefined, false);
    expect(undiscounted).toHaveLength(1);
    expect(undiscounted[0].ownerOnly).toBe(true);
  });

  it('asks the database for appointments newest-first', async () => {
    const { service } = makeService();
    const find = jest.spyOn(
      (service as unknown as { appointmentRepository: { find: jest.Mock } })
        .appointmentRepository,
      'find',
    );

    await service.getDoctorPatients(1);

    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({ order: { startAt: 'DESC', id: 'DESC' } }),
    );
    find.mockRestore();
  });

  it('orders patients by most recent appointment, newest first', async () => {
    const { service, state } = makeService();
    state.appointments = [
      { animalId: 5, patientId: 7, startAt: new Date('2026-01-10') },
      { animalId: 6, patientId: 8, startAt: new Date('2026-09-01') },
    ];
    state.animals = [animal(5, 7, 'Old cow'), animal(6, 8, 'New cow')];
    state.users = { 7: owner(7, 'Karim'), 8: owner(8, 'Rahim') };

    const patients = await service.getDoctorPatients(1);

    expect(patients.map((p) => p.name)).toEqual(['New cow', 'Old cow']);
  });

  it('bumps every animal of an owner to the top on a new owner booking', async () => {
    const { service, state } = makeService();
    state.appointments = [
      { animalId: 6, patientId: 8, startAt: new Date('2026-08-01') },
      { animalId: null, patientId: 7, startAt: new Date('2026-10-01') },
    ];
    state.animals = [animal(5, 7, 'Pakhi'), animal(6, 8, 'Rani')];
    state.users = { 7: owner(7, 'Rahim'), 8: owner(8, 'Karim') };

    const patients = await service.getDoctorPatients(1);

    expect(patients.map((p) => p.name)).toEqual(['Pakhi', 'Rani']);
  });

  it('interleaves owner-only rows by recency instead of appending them last', async () => {
    const { service, state } = makeService();
    state.appointments = [
      { animalId: null, patientId: 7, startAt: new Date('2026-10-01') },
      { animalId: 5, patientId: 8, startAt: new Date('2026-08-01') },
    ];
    state.animals = [animal(5, 8, 'Old cow')];
    state.users = { 7: owner(7, 'Rahim'), 8: owner(8, 'Karim') };

    const patients = await service.getDoctorPatients(1);

    expect(patients.map((p) => p.name)).toEqual(['Rahim', 'Old cow']);
    expect(patients[0].ownerOnly).toBe(true);
  });

  it('breaks recency ties by ascending id so the order stays stable', async () => {
    const { service, state } = makeService();
    const sameDay = new Date('2026-09-01');
    state.appointments = [
      { animalId: 6, patientId: 8, startAt: sameDay },
      { animalId: 5, patientId: 7, startAt: sameDay },
    ];
    state.animals = [animal(5, 7, 'Pakhi'), animal(6, 8, 'Rani')];
    state.users = { 7: owner(7, 'Karim'), 8: owner(8, 'Rahim') };

    const first = await service.getDoctorPatients(1);
    const second = await service.getDoctorPatients(1);

    expect(first.map((p) => p.id)).toEqual([5, 6]);
    expect(second.map((p) => p.id)).toEqual(first.map((p) => p.id));
  });
});
