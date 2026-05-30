import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from './entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockNotification: Partial<Notification> = {
    id: 1,
    user_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
    type: NotificationType.EventCreated,
    title: 'Test',
    message: 'Test message',
    read: false,
    created_at: new Date('2024-01-01'),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a notification', async () => {
      mockRepository.create.mockReturnValue(mockNotification);
      mockRepository.save.mockResolvedValue(mockNotification);

      const result = await service.create(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        NotificationType.EventCreated,
        'Test',
        'Test message',
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        user_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        type: NotificationType.EventCreated,
        title: 'Test',
        message: 'Test message',
        data: null,
      });
      expect(result).toEqual(mockNotification);
    });

    it('should pass data when provided', async () => {
      const data = { key: 'value' };
      mockRepository.create.mockReturnValue(mockNotification);
      mockRepository.save.mockResolvedValue(mockNotification);

      await service.create(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        NotificationType.EventCreated,
        'T',
        'M',
        data,
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ data }),
      );
    });
  });

  describe('findAllForUser', () => {
    it('should return paginated notifications for a user', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockNotification], 1]);
      mockRepository.count.mockResolvedValue(0);

      const result = await service.findAllForUser(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        1,
        20,
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.unreadCount).toBe(0);
    });

    it('should query read filter when provided', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);
      mockRepository.count.mockResolvedValue(0);

      await service.findAllForUser(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        1,
        20,
        false,
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            user_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
            read: false,
          },
        }),
      );
    });

    it('should cap limit at 100', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);
      mockRepository.count.mockResolvedValue(0);

      const result = await service.findAllForUser(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        1,
        999,
      );

      expect(result.limit).toBe(100);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe('markAsRead', () => {
    it('should update notification read to true', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.markAsRead(1, 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 1, user_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN' },
        { read: true },
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      mockRepository.update.mockResolvedValue({ affected: 3 });

      const result = await service.markAllAsRead(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
      );

      expect(mockRepository.update).toHaveBeenCalledWith(
        {
          user_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
          read: false,
        },
        { read: true },
      );
      expect(result).toEqual({ updated: 3 });
    });
  });

  describe('remove', () => {
    it('should soft delete notification when found and owned by user', async () => {
      mockRepository.findOne.mockResolvedValue(mockNotification);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove(1, 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
          user_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        },
      });
      expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when notification not found or not owned', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove(1, 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN'),
      ).rejects.toThrow(NotFoundException);

      expect(mockRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('markMultipleAsRead', () => {
    it('should update multiple notifications as read', async () => {
      mockRepository.update.mockResolvedValue({ affected: 2 });

      const result = await service.markMultipleAsRead(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        [1, 2],
      );

      expect(mockRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        }),
        { read: true },
      );
      expect(result).toEqual({ updated: 2 });
    });

    it('should return 0 when no notifications affected', async () => {
      mockRepository.update.mockResolvedValue({ affected: undefined });

      const result = await service.markMultipleAsRead(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        [99],
      );

      expect(result).toEqual({ updated: 0 });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for a user', async () => {
      mockRepository.count.mockResolvedValue(5);

      const count = await service.getUnreadCount(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
      );

      expect(count).toBe(5);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          user_address: 'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
          read: false,
        },
      });
    });

    it('should return 0 when user has no unread notifications', async () => {
      mockRepository.count.mockResolvedValue(0);

      const count = await service.getUnreadCount(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
      );

      expect(count).toBe(0);
    });
  });

  describe('findAllForUser - type filter', () => {
    it('should filter by notification type when provided', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);
      mockRepository.count.mockResolvedValue(0);

      await service.findAllForUser(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        1,
        20,
        undefined,
        NotificationType.MatchAdded,
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: NotificationType.MatchAdded,
          }),
        }),
      );
    });

    it('should calculate correct skip offset for page 3', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);
      mockRepository.count.mockResolvedValue(0);

      await service.findAllForUser(
        'GBRPYHIL2CI3WHZDTOOQFC6EB4RRJC3XNRBF7XN',
        3,
        10,
      );

      expect(mockRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });
});
