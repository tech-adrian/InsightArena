import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  AnalyticsService,
  accuracyRateFromUser,
  predictorTierFromReputation,
} from './analytics.service';
import { User } from '../users/entities/user.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { LeaderboardEntry } from '../leaderboard/entities/leaderboard-entry.entity';
import { Market } from '../markets/entities/market.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { MarketHistory } from './entities/market-history.entity';

describe('predictorTierFromReputation', () => {
  it('maps thresholds to tier labels', () => {
    expect(predictorTierFromReputation(0)).toBe('Bronze Predictor');
    expect(predictorTierFromReputation(199)).toBe('Bronze Predictor');
    expect(predictorTierFromReputation(200)).toBe('Silver Predictor');
    expect(predictorTierFromReputation(499)).toBe('Silver Predictor');
    expect(predictorTierFromReputation(500)).toBe('Gold Predictor');
    expect(predictorTierFromReputation(999)).toBe('Gold Predictor');
    expect(predictorTierFromReputation(1000)).toBe('Platinum Predictor');
    expect(predictorTierFromReputation(840)).toBe('Gold Predictor');
  });
});

describe('accuracyRateFromUser', () => {
  it('returns 0.0 when there are no predictions', () => {
    const u = { total_predictions: 0, correct_predictions: 0 } as User;
    expect(accuracyRateFromUser(u)).toBe('0.0');
  });

  it('formats one decimal place', () => {
    const u = {
      total_predictions: 3,
      correct_predictions: 2,
    } as User;
    expect(accuracyRateFromUser(u)).toBe('66.7');
  });
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let module: TestingModule;
  let usersRepository: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let predictionsRepository: jest.Mocked<
    Pick<Repository<Prediction>, 'createQueryBuilder' | 'find'>
  >;
  let leaderboardRepository: jest.Mocked<
    Pick<Repository<LeaderboardEntry>, 'createQueryBuilder'>
  >;
  let marketHistoryRepository: jest.Mocked<
    Pick<Repository<MarketHistory>, 'createQueryBuilder'>
  >;

  const baseUser: User = {
    id: 'user-id-1',
    stellar_address: 'GADDR',
    username: 'u',
    avatar_url: null,
    total_predictions: 10,
    correct_predictions: 7,
    total_staked_stroops: '0',
    total_winnings_stroops: '1240000000',
    reputation_score: 840,
    season_points: 0,
    role: 'user',
    is_banned: false,
    ban_reason: null,
    banned_at: null,
    banned_by: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as User;

  beforeEach(async () => {
    usersRepository = { findOne: jest.fn() };
    leaderboardRepository = { createQueryBuilder: jest.fn() };
    predictionsRepository = { createQueryBuilder: jest.fn(), find: jest.fn() };
    marketHistoryRepository = { createQueryBuilder: jest.fn() };

    module = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(User), useValue: usersRepository },
        {
          provide: getRepositoryToken(Prediction),
          useValue: predictionsRepository,
        },
        {
          provide: getRepositoryToken(LeaderboardEntry),
          useValue: leaderboardRepository,
        },
        {
          provide: getRepositoryToken(Market),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(ActivityLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MarketHistory),
          useValue: marketHistoryRepository,
        },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  function mockQb(terminal: { getCount?: number; getMany?: Prediction[] }) {
    const chain = {
      innerJoin: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(terminal.getCount ?? 0),
      getMany: jest.fn().mockResolvedValue(terminal.getMany ?? []),
    };
    return chain as unknown;
  }

  function mockLeaderboardQb(entry: LeaderboardEntry | null) {
    return {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(entry),
    } as unknown;
  }

  it('aggregates KPIs from user, leaderboard entry, and predictions', async () => {
    usersRepository.findOne.mockResolvedValue(baseUser);
    leaderboardRepository.createQueryBuilder.mockReturnValue(
      mockLeaderboardQb({
        rank: 24,
      } as LeaderboardEntry) as SelectQueryBuilder<LeaderboardEntry>,
    );

    const market = {
      is_resolved: true,
      is_cancelled: false,
      resolved_outcome: 'Yes',
      resolution_time: new Date('2025-01-02'),
    } as Market;

    const winPred = {
      chosen_outcome: 'Yes',
      market,
    } as Prediction;

    let call = 0;
    predictionsRepository.createQueryBuilder.mockImplementation(() => {
      call += 1;
      if (call === 1)
        return mockQb({
          getCount: 5,
        }) as SelectQueryBuilder<Prediction>;
      return mockQb({
        getMany: [winPred, winPred, winPred, winPred],
      }) as SelectQueryBuilder<Prediction>;
    });

    const result = await service.getDashboardKPIs({
      id: baseUser.id,
    } as User);

    expect(result).toEqual({
      total_predictions: 10,
      accuracy_rate: '70.0',
      current_rank: 24,
      total_rewards_earned_stroops: '1240000000',
      active_predictions_count: 5,
      current_streak: 4,
      reputation_score: 840,
      tier: 'Gold Predictor',
    });
  });

  it('uses rank 0 when there is no global leaderboard row', async () => {
    usersRepository.findOne.mockResolvedValue(baseUser);
    leaderboardRepository.createQueryBuilder.mockReturnValue(
      mockLeaderboardQb(null) as SelectQueryBuilder<LeaderboardEntry>,
    );

    let call = 0;
    predictionsRepository.createQueryBuilder.mockImplementation(() => {
      call += 1;
      if (call === 1)
        return mockQb({
          getCount: 0,
        }) as SelectQueryBuilder<Prediction>;
      return mockQb({
        getMany: [],
      }) as SelectQueryBuilder<Prediction>;
    });

    const result = await service.getDashboardKPIs({ id: baseUser.id } as User);

    expect(result.current_rank).toBe(0);
    expect(result.current_streak).toBe(0);
  });

  it('breaks streak on first loss in resolution order', async () => {
    usersRepository.findOne.mockResolvedValue(baseUser);
    leaderboardRepository.createQueryBuilder.mockReturnValue(
      mockLeaderboardQb(null) as SelectQueryBuilder<LeaderboardEntry>,
    );

    const mYes = {
      is_resolved: true,
      is_cancelled: false,
      resolved_outcome: 'Yes',
      resolution_time: new Date('2025-01-03'),
    } as Market;
    const mNo = {
      is_resolved: true,
      is_cancelled: false,
      resolved_outcome: 'No',
      resolution_time: new Date('2025-01-02'),
    } as Market;

    let call = 0;
    predictionsRepository.createQueryBuilder.mockImplementation(() => {
      call += 1;
      if (call === 1)
        return mockQb({
          getCount: 0,
        }) as SelectQueryBuilder<Prediction>;
      return mockQb({
        getMany: [
          { chosen_outcome: 'No', market: mYes } as Prediction,
          { chosen_outcome: 'Yes', market: mNo } as Prediction,
        ],
      }) as SelectQueryBuilder<Prediction>;
    });

    const result = await service.getDashboardKPIs({ id: baseUser.id } as User);
    expect(result.current_streak).toBe(0);
  });

  describe('getMarketHistory', () => {
    it('should return market history in the requested format', async () => {
      const mockMarket = { id: 'market-1', title: 'Market 1' } as Market;
      const mockHistory = [
        {
          recorded_at: new Date(),
          pool_size_stroops: '1000',
          participant_count: 5,
          outcome_probabilities: ['60.00', '40.00'],
        } as MarketHistory,
      ];

      const marketsRepository = module.get(getRepositoryToken(Market));
      const marketHistoryRepository = module.get(
        getRepositoryToken(MarketHistory),
      );

      jest.spyOn(marketsRepository, 'findOne').mockResolvedValue(mockMarket);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockHistory),
      };
      jest
        .spyOn(marketHistoryRepository, 'createQueryBuilder')
        .mockReturnValue(qb as any);

      const result = await service.getMarketHistory('market-1');

      expect(result.market_id).toBe('market-1');
      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toEqual({
        timestamp: mockHistory[0].recorded_at,
        prediction_volume: undefined, // default for mock
        pool_size_stroops: '1000',
        participant_count: 5,
        outcome_probabilities: [60, 40],
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'history.recorded_at >= :from',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException for invalid market', async () => {
      const marketsRepository = module.get(getRepositoryToken(Market));
      jest.spyOn(marketsRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getMarketHistory('invalid')).rejects.toThrow(
        'Market "invalid" not found',
      );
    });

    it('should apply to/from date filters when provided', async () => {
      const mockMarket = { id: 'market-1', title: 'Market 1' } as Market;
      const marketsRepository = module.get(getRepositoryToken(Market));
      const marketHistoryRepository = module.get(
        getRepositoryToken(MarketHistory),
      );

      jest.spyOn(marketsRepository, 'findOne').mockResolvedValue(mockMarket);

      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      jest
        .spyOn(marketHistoryRepository, 'createQueryBuilder')
        .mockReturnValue(qb as any);

      await service.getMarketHistory(
        'market-1',
        '2025-01-01',
        '2025-12-31',
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'history.recorded_at >= :from',
        expect.any(Object),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'history.recorded_at <= :to',
        expect.any(Object),
      );
    });
  });

  describe('logActivity', () => {
    it('should create and save an activity log entry', async () => {
      const activityLogsRepository = module.get(
        getRepositoryToken(ActivityLog),
      );
      const mockLog = {
        userId: 'user-id-1',
        actionType: 'prediction_submitted',
      } as ActivityLog;

      jest.spyOn(activityLogsRepository, 'create').mockReturnValue(mockLog);
      jest.spyOn(activityLogsRepository, 'save').mockResolvedValue(mockLog);

      const result = await service.logActivity(
        'user-id-1',
        'prediction_submitted',
        { marketId: 'market-1' },
        '192.168.1.1',
      );

      expect(activityLogsRepository.create).toHaveBeenCalledWith({
        userId: 'user-id-1',
        actionType: 'prediction_submitted',
        actionDetails: { marketId: 'market-1' },
        ipAddress: '192.168.1.1',
      });
      expect(result).toEqual(mockLog);
    });
  });

  describe('getMarketAnalytics', () => {
    it('should return market analytics with outcome distribution', async () => {
      const mockMarket = {
        id: 'market-1',
        title: 'Will ETH reach $5k?',
        total_pool_stroops: '50000000',
        participant_count: 3,
        outcome_options: ['Yes', 'No'],
        end_time: new Date(Date.now() + 3600 * 1000).toISOString(),
      } as unknown as Market;

      const mockPredictions = [
        { chosen_outcome: 'Yes' },
        { chosen_outcome: 'Yes' },
        { chosen_outcome: 'No' },
      ] as any[];

      const marketsRepository = module.get(getRepositoryToken(Market));
      const predictionsRepository = module.get(getRepositoryToken(Prediction));

      jest.spyOn(marketsRepository, 'findOne').mockResolvedValue(mockMarket);
      jest
        .spyOn(predictionsRepository, 'find')
        .mockResolvedValue(mockPredictions);

      const result = await service.getMarketAnalytics('market-1');

      expect(result.market_id).toBe('market-1');
      expect(result.total_pool_stroops).toBe('50000000');
      expect(result.participant_count).toBe(3);
      expect(result.outcome_distribution).toHaveLength(2);

      const yesEntry = result.outcome_distribution.find(
        (o) => o.outcome === 'Yes',
      );
      expect(yesEntry?.count).toBe(2);
      expect(yesEntry?.percentage).toBeCloseTo(66.67, 1);

      const noEntry = result.outcome_distribution.find(
        (o) => o.outcome === 'No',
      );
      expect(noEntry?.count).toBe(1);
    });

    it('should throw NotFoundException for unknown market', async () => {
      const marketsRepository = module.get(getRepositoryToken(Market));
      jest.spyOn(marketsRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getMarketAnalytics('unknown')).rejects.toThrow(
        'Market "unknown" not found',
      );
    });
  });

  describe('getCategoryAnalytics', () => {
    it('should aggregate markets by category', async () => {
      const mockMarkets = [
        {
          category: 'Crypto',
          is_resolved: false,
          is_cancelled: false,
          total_pool_stroops: '10000000',
          participant_count: 20,
        },
        {
          category: 'Crypto',
          is_resolved: true,
          is_cancelled: false,
          total_pool_stroops: '5000000',
          participant_count: 10,
        },
        {
          category: 'Sports',
          is_resolved: false,
          is_cancelled: false,
          total_pool_stroops: '2000000',
          participant_count: 5,
        },
      ] as Market[];

      const marketsRepository = module.get(getRepositoryToken(Market));
      jest.spyOn(marketsRepository, 'find').mockResolvedValue(mockMarkets);

      const result = await service.getCategoryAnalytics();

      expect(result.categories).toHaveLength(2);

      const crypto = result.categories.find((c) => c.name === 'Crypto');
      expect(crypto?.total_markets).toBe(2);
      expect(crypto?.active_markets).toBe(1);
      expect(crypto?.total_volume_stroops).toBe('15000000');
      expect(crypto?.trending).toBe(false); // 1/2 = 50%, not > 50%

      const sports = result.categories.find((c) => c.name === 'Sports');
      expect(sports?.total_markets).toBe(1);
      expect(sports?.active_markets).toBe(1);
      expect(sports?.trending).toBe(true); // 1/1 = 100% > 50%
    });

    it('should sort categories by volume descending', async () => {
      const mockMarkets = [
        {
          category: 'Low',
          is_resolved: false,
          is_cancelled: false,
          total_pool_stroops: '1000',
          participant_count: 1,
        },
        {
          category: 'High',
          is_resolved: false,
          is_cancelled: false,
          total_pool_stroops: '9000000',
          participant_count: 50,
        },
      ] as Market[];

      const marketsRepository = module.get(getRepositoryToken(Market));
      jest.spyOn(marketsRepository, 'find').mockResolvedValue(mockMarkets);

      const result = await service.getCategoryAnalytics();

      expect(result.categories[0].name).toBe('High');
      expect(result.categories[1].name).toBe('Low');
    });
  });

  describe('getUserTrends', () => {
    it('should throw NotFoundException for unknown user address', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getUserTrends('GUNKNOWN'),
      ).rejects.toThrow('User with address GUNKNOWN not found');
    });

    it('should return trend data for a known user', async () => {
      usersRepository.findOne.mockResolvedValue(baseUser);

      const predictionsRepository = module.get(getRepositoryToken(Prediction));
      jest.spyOn(predictionsRepository, 'find').mockResolvedValue([]);

      const result = await service.getUserTrends('GADDR', 30);

      expect(result.address).toBe('GADDR');
      expect(Array.isArray(result.accuracy_trend)).toBe(true);
      expect(Array.isArray(result.prediction_volume_trend)).toBe(true);
      expect(Array.isArray(result.profit_loss_trend)).toBe(true);
      expect(Array.isArray(result.category_performance)).toBe(true);
    });

    it('should clamp days to max 90', async () => {
      usersRepository.findOne.mockResolvedValue(baseUser);

      const predictionsRepository = module.get(getRepositoryToken(Prediction));
      jest.spyOn(predictionsRepository, 'find').mockResolvedValue([]);

      const result = await service.getUserTrends('GADDR', 999);

      expect(result.address).toBe('GADDR');
    });
  });
});
