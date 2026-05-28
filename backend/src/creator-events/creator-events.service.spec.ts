import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreatorEventsService } from './creator-events.service';
import {
  ContractService,
  ContractEvent,
  ContractMatch,
  ContractPrediction,
  ContractParticipant,
} from '../contract/contract.service';
import {
  ListMatchesQueryDto,
  MatchStatus,
  MatchSortBy,
  SortOrder,
} from './dto/list-matches-query.dto';

describe('CreatorEventsService', () => {
  let service: CreatorEventsService;
  let contractService: jest.Mocked<ContractService>;

  const mockEvent: ContractEvent = {
    eventId: 'event-1',
    inviteCode: 'ABC123',
    creator: 'GCREATOR',
    title: 'Test Event',
    description: 'Test Description',
    startTime: 1000000,
    endTime: 2000000,
    maxParticipants: 100,
    participantCount: 50,
    isActive: true,
  };

  const mockMatches: ContractMatch[] = [
    {
      matchId: 'match-1',
      eventId: 'event-1',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: 1100000,
      resolved: false,
      outcome: null,
    },
    {
      matchId: 'match-2',
      eventId: 'event-1',
      homeTeam: 'Team C',
      awayTeam: 'Team D',
      startTime: 1200000,
      resolved: true,
      outcome: 'Team C',
    },
    {
      matchId: 'match-3',
      eventId: 'event-1',
      homeTeam: 'Team E',
      awayTeam: 'Team F',
      startTime: 1300000,
      resolved: true,
      outcome: 'Team F',
    },
  ];

  const mockPredictions: ContractPrediction[] = [
    {
      predictionId: 'pred-1',
      matchId: 'match-1',
      user: 'GUSER1',
      chosenOutcome: 'Team A',
      stakeAmount: '1000',
      claimed: false,
    },
    {
      predictionId: 'pred-2',
      matchId: 'match-2',
      user: 'GUSER1',
      chosenOutcome: 'Team C',
      stakeAmount: '1000',
      claimed: false,
    },
    {
      predictionId: 'pred-3',
      matchId: 'match-3',
      user: 'GUSER1',
      chosenOutcome: 'Team F',
      stakeAmount: '1000',
      claimed: false,
    },
  ];

  const mockParticipants: ContractParticipant[] = [
    {
      address: 'GUSER1',
      joinedAt: 1000000,
      predictionCount: 3,
    },
    {
      address: 'GUSER2',
      joinedAt: 1000100,
      predictionCount: 2,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorEventsService,
        {
          provide: ContractService,
          useValue: {
            getEvent: jest.fn(),
            getEventByCode: jest.fn(),
            getEventMatches: jest.fn(),
            getUserPredictions: jest.fn(),
            getEventParticipants: jest.fn(),
            getEventWinners: jest.fn(),
            isVerified: jest.fn(),
            getConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CreatorEventsService>(CreatorEventsService);
    contractService = module.get(ContractService);
  });

  describe('getEventMatches', () => {
    it('should return all matches when status is "all"', async () => {
      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);

      const query: ListMatchesQueryDto = {
        status: MatchStatus.All,
        sortBy: MatchSortBy.MatchTime,
        sortOrder: SortOrder.Asc,
      };

      const result = await service.getEventMatches('event-1', query);

      expect(result).toHaveLength(3);
      expect(result[0].matchId).toBe('match-1');
    });

    it('should filter pending matches', async () => {
      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);

      const query: ListMatchesQueryDto = {
        status: MatchStatus.Pending,
        sortBy: MatchSortBy.MatchTime,
        sortOrder: SortOrder.Asc,
      };

      const result = await service.getEventMatches('event-1', query);

      expect(result).toHaveLength(1);
      expect(result[0].resolved).toBe(false);
    });

    it('should filter completed matches', async () => {
      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);

      const query: ListMatchesQueryDto = {
        status: MatchStatus.Completed,
        sortBy: MatchSortBy.MatchTime,
        sortOrder: SortOrder.Asc,
      };

      const result = await service.getEventMatches('event-1', query);

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.resolved)).toBe(true);
    });

    it('should sort matches by match_time ascending', async () => {
      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);

      const query: ListMatchesQueryDto = {
        status: MatchStatus.All,
        sortBy: MatchSortBy.MatchTime,
        sortOrder: SortOrder.Asc,
      };

      const result = await service.getEventMatches('event-1', query);

      expect(result[0].startTime).toBeLessThan(result[1].startTime);
      expect(result[1].startTime).toBeLessThan(result[2].startTime);
    });

    it('should sort matches by match_time descending', async () => {
      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);

      const query: ListMatchesQueryDto = {
        status: MatchStatus.All,
        sortBy: MatchSortBy.MatchTime,
        sortOrder: SortOrder.Desc,
      };

      const result = await service.getEventMatches('event-1', query);

      expect(result[0].startTime).toBeGreaterThan(result[1].startTime);
      expect(result[1].startTime).toBeGreaterThan(result[2].startTime);
    });

    it('should throw NotFoundException if event does not exist', async () => {
      contractService.getEvent.mockResolvedValue(null);

      const query: ListMatchesQueryDto = {
        status: MatchStatus.All,
        sortBy: MatchSortBy.MatchTime,
        sortOrder: SortOrder.Asc,
      };

      await expect(
        service.getEventMatches('nonexistent', query),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEventByInviteCode', () => {
    it('should return event details by invite code', async () => {
      contractService.getEventByCode.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getEventWinners.mockResolvedValue([]);

      const result = await service.getEventByInviteCode('ABC123');

      expect(result.eventId).toBe('event-1');
      expect(result.title).toBe('Test Event');
      expect(result.matchCount).toBe(3);
      expect(result.status).toBe('active');
    });

    it('should return status "full" when participant count equals max', async () => {
      const fullEvent = {
        ...mockEvent,
        participantCount: 100,
        maxParticipants: 100,
      };
      contractService.getEventByCode.mockResolvedValue(fullEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getEventWinners.mockResolvedValue([]);

      const result = await service.getEventByInviteCode('ABC123');

      expect(result.status).toBe('full');
    });

    it('should return status "cancelled" when event is not active', async () => {
      const cancelledEvent = { ...mockEvent, isActive: false };
      contractService.getEventByCode.mockResolvedValue(cancelledEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getEventWinners.mockResolvedValue([]);

      const result = await service.getEventByInviteCode('ABC123');

      expect(result.status).toBe('cancelled');
    });

    it('should include first 5 matches in preview', async () => {
      const manyMatches = Array.from({ length: 10 }, (_, i) => ({
        ...mockMatches[0],
        matchId: `match-${i}`,
        startTime: 1100000 + i * 100000,
      }));

      contractService.getEventByCode.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(manyMatches);
      contractService.getEventWinners.mockResolvedValue([]);

      const result = await service.getEventByInviteCode('ABC123');

      expect(result.matchPreview).toHaveLength(5);
      expect(result.matchCount).toBe(10);
    });

    it('should throw NotFoundException if code does not exist', async () => {
      contractService.getEventByCode.mockResolvedValue(null);

      await expect(service.getEventByInviteCode('INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserScore', () => {
    it('should calculate user score correctly', async () => {
      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getUserPredictions.mockResolvedValue(mockPredictions);
      contractService.getEventParticipants.mockResolvedValue(mockParticipants);

      const result = await service.getUserScore('event-1', 'GUSER1');

      expect(result.address).toBe('GUSER1');
      expect(result.totalMatches).toBe(3);
      expect(result.totalPredictions).toBe(3);
      expect(result.correctPredictions).toBe(2); // match-2 and match-3
      expect(result.incorrectPredictions).toBe(0);
      expect(result.pendingPredictions).toBe(1); // match-1
      expect(result.accuracyPercentage).toBe(100); // 2/2 resolved
      expect(result.rank).toBe(1);
    });

    it('should calculate accuracy percentage correctly', async () => {
      const predictions: ContractPrediction[] = [
        {
          predictionId: 'pred-1',
          matchId: 'match-1',
          user: 'GUSER2',
          chosenOutcome: 'Team A',
          stakeAmount: '1000',
          claimed: false,
        },
        {
          predictionId: 'pred-2',
          matchId: 'match-2',
          user: 'GUSER2',
          chosenOutcome: 'Team C',
          stakeAmount: '1000',
          claimed: false,
        },
        {
          predictionId: 'pred-3',
          matchId: 'match-3',
          user: 'GUSER2',
          chosenOutcome: 'Team E', // Wrong prediction
          stakeAmount: '1000',
          claimed: false,
        },
      ];

      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getUserPredictions.mockResolvedValue(predictions);
      contractService.getEventParticipants.mockResolvedValue(mockParticipants);

      const result = await service.getUserScore('event-1', 'GUSER2');

      expect(result.correctPredictions).toBe(1);
      expect(result.incorrectPredictions).toBe(1);
      expect(result.accuracyPercentage).toBe(50); // 1/2 resolved
    });

    it('should mark user as winner when all predictions are correct and none pending', async () => {
      // Only resolved predictions, all correct
      const predictions: ContractPrediction[] = [
        {
          predictionId: 'pred-2',
          matchId: 'match-2',
          user: 'GUSER1',
          chosenOutcome: 'Team C',
          stakeAmount: '1000',
          claimed: false,
        },
        {
          predictionId: 'pred-3',
          matchId: 'match-3',
          user: 'GUSER1',
          chosenOutcome: 'Team F',
          stakeAmount: '1000',
          claimed: false,
        },
      ];

      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getUserPredictions.mockResolvedValue(predictions);
      contractService.getEventParticipants.mockResolvedValue(mockParticipants);

      const result = await service.getUserScore('event-1', 'GUSER1');

      expect(result.isWinner).toBe(true);
    });

    it('should not mark as winner if there are pending predictions', async () => {
      const predictions: ContractPrediction[] = [
        {
          predictionId: 'pred-1',
          matchId: 'match-1',
          user: 'GUSER3',
          chosenOutcome: 'Team A',
          stakeAmount: '1000',
          claimed: false,
        },
        {
          predictionId: 'pred-2',
          matchId: 'match-2',
          user: 'GUSER3',
          chosenOutcome: 'Team C',
          stakeAmount: '1000',
          claimed: false,
        },
      ];

      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getUserPredictions.mockResolvedValue(predictions);
      contractService.getEventParticipants.mockResolvedValue(mockParticipants);

      const result = await service.getUserScore('event-1', 'GUSER3');

      expect(result.isWinner).toBe(false);
    });

    it('should calculate rank correctly', async () => {
      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getUserPredictions.mockResolvedValue(mockPredictions);
      contractService.getEventParticipants.mockResolvedValue(mockParticipants);

      const result = await service.getUserScore('event-1', 'GUSER1');

      expect(result.rank).toBe(1); // First participant
    });

    it('should throw NotFoundException if event does not exist', async () => {
      contractService.getEvent.mockResolvedValue(null);

      await expect(
        service.getUserScore('nonexistent', 'GUSER1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle user with no predictions', async () => {
      contractService.getEvent.mockResolvedValue(mockEvent);
      contractService.getEventMatches.mockResolvedValue(mockMatches);
      contractService.getUserPredictions.mockResolvedValue([]);
      contractService.getEventParticipants.mockResolvedValue(mockParticipants);

      const result = await service.getUserScore('event-1', 'GUSER_NEW');

      expect(result.totalPredictions).toBe(0);
      expect(result.correctPredictions).toBe(0);
      expect(result.accuracyPercentage).toBe(0);
      expect(result.isWinner).toBe(false);
    });
  });
});
