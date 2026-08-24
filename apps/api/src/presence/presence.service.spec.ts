import { Test } from '@nestjs/testing';

import { PresenceService } from './presence.service';
import { RedisService } from '../redis/redis.service';

describe('PresenceService', () => {
  let presenceService: PresenceService;

  const redisServiceMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PresenceService,
        {
          provide: RedisService,
          useValue: redisServiceMock,
        },
      ],
    }).compile();

    presenceService = moduleRef.get<PresenceService>(PresenceService);

    jest.clearAllMocks();
  });

  it('서비스가 생성되어야 한다', () => {
    expect(presenceService).toBeDefined();
  });

  it('기존 Presence가 없으면 heartbeat 시 온라인 전환으로 판단한다', async () => {
    redisServiceMock.get.mockResolvedValue(null);
    redisServiceMock.set.mockResolvedValue(undefined);

    const result = await presenceService.heartbeat('user-a');

    expect(result).toBe(true);

    expect(redisServiceMock.get).toHaveBeenCalledWith('presence:user-a');

    expect(redisServiceMock.set).toHaveBeenCalledWith(
      'presence:user-a',
      '1',
      15,
    );
  });

  it('이미 온라인이면 heartbeat 시 새로운 온라인 전환으로 판단하지 않는다', async () => {
    redisServiceMock.get.mockResolvedValue('1');
    redisServiceMock.set.mockResolvedValue(undefined);

    const result = await presenceService.heartbeat('user-a');

    expect(result).toBe(false);

    expect(redisServiceMock.set).toHaveBeenCalledWith(
      'presence:user-a',
      '1',
      15,
    );
  });

  it('Presence key가 존재하면 온라인 상태로 판단한다', async () => {
    redisServiceMock.get.mockResolvedValue('1');

    const result = await presenceService.isOnline('user-a');

    expect(result).toBe(true);
  });

  it('Presence key가 없으면 오프라인 상태로 판단한다', async () => {
    redisServiceMock.get.mockResolvedValue(null);

    const result = await presenceService.isOnline('user-a');

    expect(result).toBe(false);
  });

  it('Presence 삭제 시 해당 사용자 key를 삭제한다', async () => {
    redisServiceMock.del.mockResolvedValue(undefined);

    await presenceService.remove('user-a');

    expect(redisServiceMock.del).toHaveBeenCalledWith('presence:user-a');
  });
});
