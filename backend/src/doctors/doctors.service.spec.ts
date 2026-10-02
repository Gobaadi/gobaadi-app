import { ForbiddenException } from '@nestjs/common';

// The real service pulls in the meilisearch SDK, which ships untranspiled ESM
// that this jest setup does not transform - stub it out.
jest.mock('../meilisearch/meilisearch.service', () => ({
  MeilisearchService: class MeilisearchService {},
}));

import { DoctorsService } from './doctors.service';
import { Doctor } from './doctor.entity';

type DoctorRow = Partial<Doctor> & { id: number; userId: number };

interface State {
  doctors: DoctorRow[];
  users: Record<number, { id: number; name?: string }>;
}

const makeService = () => {
  const state: State = { doctors: [], users: {} };

  const doctorRepository = {
    findOneBy: jest.fn((where: { userId?: number; id?: number }) => {
      const found =
        where.userId !== undefined
          ? state.doctors.find((d) => d.userId === where.userId)
          : state.doctors.find((d) => d.id === where.id);
      return Promise.resolve(found ? { ...found } : null);
    }),
    save: jest.fn((doctor: DoctorRow) => {
      const idx = state.doctors.findIndex((d) => d.id === doctor.id);
      if (idx >= 0) state.doctors[idx] = { ...state.doctors[idx], ...doctor };
      else state.doctors.push(doctor);
      return Promise.resolve(doctor);
    }),
  };

  const availabilityRepository = {
    find: jest.fn(() => Promise.resolve([])),
    delete: jest.fn(() => Promise.resolve({ affected: 0 })),
    save: jest.fn((entries: unknown[]) => Promise.resolve(entries)),
    create: jest.fn((entry: unknown) => entry as never),
    findOne: jest.fn(() => Promise.resolve(null)),
  };

  const userRepository = {
    update: jest.fn(() => Promise.resolve({ affected: 1 })),
  };

  const meilisearchService = { search: jest.fn(() => Promise.resolve(null)) };
  const s3Service = { uploadFile: jest.fn() };

  const service = new DoctorsService(
    doctorRepository as never,
    availabilityRepository as never,
    userRepository as never,
    meilisearchService as never,
    s3Service as never,
  );

  return { service, state, doctorRepository, userRepository };
};

const seedDoctor = (state: State): void => {
  state.doctors.push({
    id: 1,
    userId: 42,
    name: 'Dr Test',
    specialty: 'General',
    experience: '0 Years',
    avatar: '',
    bio: '',
    qualifications: [],
    specializations: [],
    credentialDocuments: [],
    experiences: [],
  });
  state.users[42] = { id: 42, name: 'Dr Test' };
};

describe('DoctorsService', () => {
  describe('updateProfile', () => {
    it('persists the credential period on the doctor row', async () => {
      const { service, state } = makeService();
      seedDoctor(state);

      const period = {
        startMonth: 'August',
        startYear: '2024',
        endMonth: 'January',
        endYear: '2026',
        isCurrentlyStudying: false,
      };
      await service.updateProfile(42, { credentialPeriod: period });

      expect(state.doctors[0].credentialPeriod).toEqual(period);
    });

    it('updates only the provided fields', async () => {
      const { service, state, userRepository } = makeService();
      seedDoctor(state);
      state.doctors[0].bio = 'Old bio';
      state.doctors[0].licenseNumber = 'VET-1';

      await service.updateProfile(42, { bio: 'New bio' });

      expect(state.doctors[0].bio).toBe('New bio');
      expect(state.doctors[0].licenseNumber).toBe('VET-1');
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('keeps the account name in sync when the profile name changes', async () => {
      const { service, state, userRepository } = makeService();
      seedDoctor(state);

      await service.updateProfile(42, { name: 'Dr Renamed' });

      expect(state.doctors[0].name).toBe('Dr Renamed');
      expect(userRepository.update).toHaveBeenCalledWith(
        { id: 42 },
        { name: 'Dr Renamed' },
      );
    });

    it('throws ForbiddenException when no doctor profile exists', async () => {
      const { service } = makeService();
      await expect(service.updateProfile(999, { bio: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateExperiences', () => {
    it('replaces the whole experiences array', async () => {
      const { service, state } = makeService();
      seedDoctor(state);
      state.doctors[0].experiences = [
        { title: 'Old', organization: 'Clinic', duration: '2020' },
      ];

      await service.updateExperiences(42, [
        { title: 'Senior Vet', organization: 'City Vet', duration: '2024' },
        { title: 'Intern', organization: 'Farm Clinic', duration: '2022' },
      ]);

      expect(state.doctors[0].experiences).toHaveLength(2);
      expect(state.doctors[0].experiences?.[0].title).toBe('Senior Vet');
    });

    it('clears experiences when an empty array is sent', async () => {
      const { service, state } = makeService();
      seedDoctor(state);
      state.doctors[0].experiences = [
        { title: 'Old', organization: 'Clinic', duration: '2020' },
      ];

      await service.updateExperiences(42, []);

      expect(state.doctors[0].experiences).toEqual([]);
    });
  });

  describe('updateQualifications / updateSpecializations', () => {
    it('stores qualification and specialization lists', async () => {
      const { service, state } = makeService();
      seedDoctor(state);

      await service.updateQualifications(42, ['BVSc', 'MVSc Surgery']);
      await service.updateSpecializations(42, ['Surgery']);

      expect(state.doctors[0].qualifications).toEqual(['BVSc', 'MVSc Surgery']);
      expect(state.doctors[0].specializations).toEqual(['Surgery']);
    });

    it('throws when the account has no doctor profile', async () => {
      const { service } = makeService();
      await expect(service.updateQualifications(7, [])).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.updateSpecializations(7, [])).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
