import { FindOperator, Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessage, MessageStatus } from './chat-message.entity';
import { ConversationService } from './conversation.service';
import { UserRole } from '../users/user.entity';

interface State {
  participant: boolean;
  unreadMessages: ChatMessage[];
  unreadWhere: unknown;
  updatedIds: unknown;
  updatedWhere: unknown;
  updatedSet: unknown;
}

const makeService = () => {
  const state: State = {
    participant: true,
    unreadMessages: [],
    unreadWhere: undefined,
    updatedIds: undefined,
    updatedWhere: undefined,
    updatedSet: undefined,
  };

  const chatMessageRepository = {
    find: jest.fn((args: { where: Record<string, unknown> }) => {
      state.unreadWhere = args.where;
      return Promise.resolve(state.unreadMessages);
    }),
    update: jest.fn((where: unknown, set: unknown) => {
      state.updatedWhere = where;
      state.updatedSet = set;
      return Promise.resolve({ affected: state.unreadMessages.length });
    }),
    findOneBy: jest.fn(() => Promise.resolve(null)),
    findOneByOrFail: jest.fn(() => Promise.resolve({ id: 1 } as ChatMessage)),
    save: jest.fn((m: ChatMessage) => Promise.resolve(m)),
    createQueryBuilder: jest.fn(),
  };
  const conversationService = {
    isParticipant: jest.fn(() => Promise.resolve(state.participant)),
    touchLastMessageAt: jest.fn(() => Promise.resolve()),
  };

  const service = new ChatService(
    chatMessageRepository as unknown as Repository<ChatMessage>,
    conversationService as unknown as ConversationService,
  );

  return { service, state, chatMessageRepository };
};

const messageRow = (id: number): ChatMessage => ({ id }) as ChatMessage;

describe('ChatService.markConversationRead', () => {
  it('rejects users who are not participants', async () => {
    const { service, state } = makeService();
    state.participant = false;

    await expect(
      service.markConversationRead(7, 999, UserRole.USER),
    ).rejects.toThrow(ForbiddenException);
  });

  it('only targets messages sent by the other party that are not yet READ', async () => {
    const { service, state } = makeService();
    state.unreadMessages = [messageRow(11), messageRow(12)];

    await service.markConversationRead(7, 42, UserRole.USER);

    const where = state.unreadWhere as {
      conversationId: number;
      senderRole: FindOperator<UserRole>;
      status: FindOperator<MessageStatus>;
    };
    expect(where.conversationId).toBe(7);
    expect(where.senderRole.type).toBe('not');
    expect(where.senderRole.value).toBe(UserRole.USER);
    expect(where.status.type).toBe('not');
    expect(where.status.value).toBe(MessageStatus.READ);
  });

  it('marks the matched messages READ and returns their ids', async () => {
    const { service, state } = makeService();
    state.unreadMessages = [messageRow(11), messageRow(12)];

    const ids = await service.markConversationRead(7, 42, UserRole.USER);

    expect(ids).toEqual([11, 12]);
    expect(state.updatedSet).toEqual({
      status: MessageStatus.READ,
      readAt: expect.any(Date) as Date,
    });
  });

  it('is a no-op when everything is already read', async () => {
    const { service, state, chatMessageRepository } = makeService();
    state.unreadMessages = [];

    const ids = await service.markConversationRead(7, 42, UserRole.USER);

    expect(ids).toEqual([]);
    expect(chatMessageRepository.update).not.toHaveBeenCalled();
  });
});
