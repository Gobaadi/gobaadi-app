import { Repository } from 'typeorm';
import { ConversationService } from './conversation.service';
import { Conversation } from './conversation.entity';
import { ChatMessage } from './chat-message.entity';
import { Appointment } from '../appointments/appointment.entity';
import { Doctor } from '../doctors/doctor.entity';
import { User, UserRole } from '../users/user.entity';
import { Animal } from '../animals/animal.entity';

interface UnreadRow {
  conversationId: number;
  count: string;
}

interface State {
  conversations: Conversation[];
  unreadRows: UnreadRow[];
  unreadWhere: string | undefined;
  unreadRole: unknown;
  unreadStatus: unknown;
}

const makeService = () => {
  const state: State = {
    conversations: [],
    unreadRows: [],
    unreadWhere: undefined,
    unreadRole: undefined,
    unreadStatus: undefined,
  };

  const queryBuilder = {
    select: jest.fn().mockImplementation(() => queryBuilder),
    addSelect: jest.fn().mockImplementation(() => queryBuilder),
    where: jest.fn().mockImplementation((where: string) => {
      state.unreadWhere = where;
      return queryBuilder;
    }),
    andWhere: jest
      .fn()
      .mockImplementation((where: string, params?: Record<string, unknown>) => {
        if (where.includes('senderRole')) {
          state.unreadRole = params?.role;
        }
        if (where.includes('status')) {
          state.unreadStatus = params?.status;
        }
        return queryBuilder;
      }),
    groupBy: jest.fn().mockImplementation(() => queryBuilder),
    getRawMany: jest.fn(() => Promise.resolve(state.unreadRows)),
  };

  const conversationRepository = {
    find: jest.fn(() => Promise.resolve(state.conversations)),
  };
  const chatMessageRepository = {
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
  const userRepository = { find: jest.fn(() => Promise.resolve([])) };
  const appointmentRepository = { find: jest.fn(() => Promise.resolve([])) };
  const animalRepository = { find: jest.fn(() => Promise.resolve([])) };
  const doctorRepository = { findOneBy: jest.fn(() => Promise.resolve(null)) };

  const service = new ConversationService(
    conversationRepository as unknown as Repository<Conversation>,
    chatMessageRepository as unknown as Repository<ChatMessage>,
    appointmentRepository as unknown as Repository<Appointment>,
    doctorRepository as unknown as Repository<Doctor>,
    userRepository as unknown as Repository<User>,
    animalRepository as unknown as Repository<Animal>,
  );

  return { service, state, queryBuilder };
};

const conversationRow = (id: number): Conversation =>
  ({ id, doctorId: 1, patientId: 42, unreadCount: 19 }) as Conversation;

describe('ConversationService.listForUser', () => {
  it('returns [] without querying unread counts when the user has no conversations', async () => {
    const { service, queryBuilder } = makeService();

    const result = await service.listForUser(42, UserRole.USER);

    expect(result).toEqual([]);
    expect(queryBuilder.getRawMany).not.toHaveBeenCalled();
  });

  it('overrides the stored unreadCount with the per-viewer computed count', async () => {
    const { service, state } = makeService();
    state.conversations = [conversationRow(7)];
    state.unreadRows = [{ conversationId: 7, count: '3' }];

    const result = await service.listForUser(42, UserRole.USER);

    expect(result).toHaveLength(1);
    expect(result[0].unreadCount).toBe(3);
  });

  it('defaults unreadCount to 0 when the conversation has no unread rows', async () => {
    const { service, state } = makeService();
    state.conversations = [conversationRow(7)];

    const result = await service.listForUser(42, UserRole.USER);

    expect(result[0].unreadCount).toBe(0);
  });

  it('counts only messages sent by the other party and not yet READ', async () => {
    const { service, state, queryBuilder } = makeService();
    state.conversations = [conversationRow(7)];

    await service.listForUser(99, UserRole.DOCTOR);

    expect(queryBuilder.where).toHaveBeenCalledWith(
      'm.conversationId IN (:...ids)',
      { ids: [7] },
    );
    expect(state.unreadRole).toBe(UserRole.DOCTOR);
    expect(state.unreadStatus).toBe('READ');
  });
});
