import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ContractService } from './contract.service';

jest.mock('@stellar/stellar-sdk', () => {
  const rpcServerInstance = {
    getAccount: jest.fn(),
    simulateTransaction: jest.fn(),
  };

  return {
    _rpcServerInstance: rpcServerInstance,
    rpc: {
      Server: jest.fn().mockReturnValue(rpcServerInstance),
      Api: {
        isSimulationError: jest.fn(),
      },
    },
    Contract: jest.fn().mockReturnValue({
      call: jest.fn().mockReturnValue({ type: 'operation' }),
    }),
    Keypair: {
      random: jest.fn().mockReturnValue({
        publicKey: jest.fn().mockReturnValue('GKEYTESTPUBLICKEY123456'),
      }),
    },
    TransactionBuilder: jest.fn().mockReturnValue({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({ type: 'transaction' }),
    }),
    Networks: {
      PUBLIC: 'Public Global Stellar Network ; September 2015',
      TESTNET: 'Test SDF Network ; September 2015',
    },
    nativeToScVal: jest.fn().mockImplementation((val) => ({ val })),
    scValToNative: jest.fn(),
    Address: jest.fn().mockReturnValue({
      toScVal: jest.fn().mockReturnValue({ type: 'address-scval' }),
    }),
    xdr: {},
  };
});

describe('ContractService', () => {
  let service: ContractService;
  let stellarMock: Record<string, any>;
  let rpcServerInstance: {
    getAccount: jest.Mock;
    simulateTransaction: jest.Mock;
  };

  const makeConfigService = (contractId: string) => ({
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, string> = {
        SOROBAN_CONTRACT_ID: contractId,
        STELLAR_NETWORK: 'testnet',
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
      };
      return config[key] ?? null;
    }),
  });

  beforeEach(async () => {
    stellarMock = jest.requireMock('@stellar/stellar-sdk');
    rpcServerInstance = stellarMock._rpcServerInstance as {
      getAccount: jest.Mock;
      simulateTransaction: jest.Mock;
    };
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractService,
        { provide: ConfigService, useValue: makeConfigService('CTEST123456789') },
      ],
    }).compile();

    service = module.get<ContractService>(ContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when contract ID is not configured', () => {
    let unconfiguredService: ContractService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ContractService,
          { provide: ConfigService, useValue: makeConfigService('') },
        ],
      }).compile();
      unconfiguredService = module.get<ContractService>(ContractService);
    });

    it('getEvent returns null', async () => {
      expect(await unconfiguredService.getEvent('1')).toBeNull();
    });

    it('getEventByCode returns null', async () => {
      expect(await unconfiguredService.getEventByCode('CODE1')).toBeNull();
    });

    it('getMatch returns null', async () => {
      expect(await unconfiguredService.getMatch('1')).toBeNull();
    });

    it('getPrediction returns null', async () => {
      expect(await unconfiguredService.getPrediction('1')).toBeNull();
    });

    it('getConfig returns null', async () => {
      expect(await unconfiguredService.getConfig()).toBeNull();
    });

    it('getEventMatches returns empty array', async () => {
      expect(await unconfiguredService.getEventMatches('1')).toEqual([]);
    });

    it('getUserPredictions returns empty array', async () => {
      expect(
        await unconfiguredService.getUserPredictions('GADDR', '1'),
      ).toEqual([]);
    });

    it('getEventParticipants returns empty array', async () => {
      expect(await unconfiguredService.getEventParticipants('1')).toEqual([]);
    });

    it('getEventWinners returns empty array', async () => {
      expect(await unconfiguredService.getEventWinners('1')).toEqual([]);
    });

    it('getCreationFee returns "0"', async () => {
      expect(await unconfiguredService.getCreationFee()).toBe('0');
    });

    it('isVerified returns false', async () => {
      expect(await unconfiguredService.isVerified('GADDR')).toBe(false);
    });

    it('getEventStatistics returns null', async () => {
      expect(await unconfiguredService.getEventStatistics('1')).toBeNull();
    });

    it('getPredictionDistribution returns zeros', async () => {
      expect(await unconfiguredService.getPredictionDistribution('1')).toEqual({
        teamA: 0,
        teamB: 0,
        draw: 0,
      });
    });
  });

  describe('getEvent', () => {
    it('calls viewCall with get_event and returns event', async () => {
      const mockEvent = {
        eventId: '1',
        inviteCode: 'ABCDEFGH',
        creator: 'GCREATOR',
        title: 'Test Event',
        description: 'Description',
        startTime: 1000000,
        endTime: 2000000,
        maxParticipants: 100,
        participantCount: 10,
        isActive: true,
      };
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(mockEvent);

      const result = await service.getEvent('1');

      expect(result).toEqual(mockEvent);
      expect((service as any).viewCall).toHaveBeenCalledWith(
        'get_event',
        expect.any(Array),
      );
    });

    it('returns null when viewCall returns null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.getEvent('1')).toBeNull();
    });
  });

  describe('getEventByCode', () => {
    it('calls viewCall with get_event_by_code', async () => {
      const mockEvent = { eventId: '2', inviteCode: 'CODE1234' };
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(mockEvent);

      const result = await service.getEventByCode('CODE1234');

      expect(result).toEqual(mockEvent);
      expect((service as any).viewCall).toHaveBeenCalledWith(
        'get_event_by_code',
        expect.any(Array),
      );
    });
  });

  describe('getMatch', () => {
    it('calls viewCall with get_match', async () => {
      const mockMatch = {
        matchId: '1',
        eventId: '1',
        homeTeam: 'Team A',
        awayTeam: 'Team B',
        startTime: 1000000,
        resolved: false,
        outcome: null,
      };
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(mockMatch);

      const result = await service.getMatch('1');

      expect(result).toEqual(mockMatch);
      expect((service as any).viewCall).toHaveBeenCalledWith(
        'get_match',
        expect.any(Array),
      );
    });
  });

  describe('getEventMatches', () => {
    it('returns matches array from viewCall', async () => {
      const matches = [
        { matchId: '1', homeTeam: 'A', awayTeam: 'B', resolved: false },
      ];
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(matches);

      expect(await service.getEventMatches('1')).toEqual(matches);
      expect((service as any).viewCall).toHaveBeenCalledWith(
        'get_event_matches',
        expect.any(Array),
      );
    });

    it('returns empty array when viewCall returns null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.getEventMatches('1')).toEqual([]);
    });
  });

  describe('getPrediction', () => {
    it('calls viewCall with get_prediction', async () => {
      const mockPred = { predictionId: '1', matchId: '1' };
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(mockPred);

      const result = await service.getPrediction('1');

      expect(result).toEqual(mockPred);
    });
  });

  describe('getUserPredictions', () => {
    it('returns predictions from viewCall', async () => {
      const preds = [{ predictionId: '1' }, { predictionId: '2' }];
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(preds);

      const result = await service.getUserPredictions('GADDR', '1');

      expect(result).toEqual(preds);
      expect((service as any).viewCall).toHaveBeenCalledWith(
        'get_user_predictions',
        expect.any(Array),
      );
    });

    it('returns empty array when viewCall returns null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.getUserPredictions('GADDR', '1')).toEqual([]);
    });
  });

  describe('getEventParticipants', () => {
    it('returns participants array', async () => {
      const participants = [
        { address: 'GADDR', joinedAt: 1000, predictionCount: 5 },
      ];
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(participants);

      expect(await service.getEventParticipants('1')).toEqual(participants);
    });

    it('returns empty array on null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.getEventParticipants('1')).toEqual([]);
    });
  });

  describe('getEventWinners', () => {
    it('returns winners from viewCall', async () => {
      const winners = [
        { address: 'GADDR', totalStake: '1000', payout: '2000' },
      ];
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(winners);

      expect(await service.getEventWinners('1')).toEqual(winners);
    });

    it('returns empty array on null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.getEventWinners('1')).toEqual([]);
    });
  });

  describe('getConfig', () => {
    it('returns contract config', async () => {
      const mockConfig = {
        admin: 'GADMIN',
        aiAgent: 'GAIAGENT',
        treasury: 'GTREASURY',
        celoToken: 'GCELO',
        creationFee: '5000000',
        paused: false,
      };
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(mockConfig);

      const result = await service.getConfig();
      expect(result).toEqual(mockConfig);
    });
  });

  describe('getCreationFee', () => {
    it('returns fee string from viewCall', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue('10000000');
      expect(await service.getCreationFee()).toBe('10000000');
    });

    it('returns "0" when viewCall returns null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.getCreationFee()).toBe('0');
    });
  });

  describe('isVerified', () => {
    it('returns true for verified address', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(true);
      expect(await service.isVerified('GADDR')).toBe(true);
    });

    it('returns false for unverified address', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(false);
      expect(await service.isVerified('GADDR')).toBe(false);
    });

    it('returns false when viewCall returns null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.isVerified('GADDR')).toBe(false);
    });
  });

  describe('getEventStatistics', () => {
    it('returns null for non-numeric eventId', async () => {
      expect(await service.getEventStatistics('not-a-number')).toBeNull();
    });

    it('returns null when viewCall returns null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.getEventStatistics('1')).toBeNull();
    });

    it('maps snake_case contract fields to typed statistics', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue({
        event_id: 1,
        participant_count: 50,
        match_count: 5,
        total_predictions: 200,
        all_matches_resolved: true,
        winners_verified: false,
        winner_count: 3,
      });

      const result = await service.getEventStatistics('1');

      expect(result).toEqual({
        eventId: '1',
        participantCount: 50,
        matchCount: 5,
        totalPredictions: 200,
        allMatchesResolved: true,
        winnersVerified: false,
        winnerCount: 3,
      });
    });

    it('maps camelCase fields from contract', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue({
        eventId: '42',
        participantCount: 10,
        matchCount: 2,
        totalPredictions: 50,
        allMatchesResolved: false,
        winnersVerified: false,
        winnerCount: 0,
      });

      const result = await service.getEventStatistics('42');
      expect(result?.participantCount).toBe(10);
      expect(result?.matchCount).toBe(2);
      expect(result?.eventId).toBe('42');
    });

    it('defaults missing fields to 0/false', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue({});

      const result = await service.getEventStatistics('1');
      expect(result?.participantCount).toBe(0);
      expect(result?.allMatchesResolved).toBe(false);
    });
  });

  describe('getPredictionDistribution', () => {
    it('returns zeros for non-numeric matchId', async () => {
      expect(await service.getPredictionDistribution('abc')).toEqual({
        teamA: 0,
        teamB: 0,
        draw: 0,
      });
    });

    it('parses distribution tuple from viewCall', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue([60, 30, 10]);

      expect(await service.getPredictionDistribution('5')).toEqual({
        teamA: 60,
        teamB: 30,
        draw: 10,
      });
    });

    it('returns zeros when viewCall returns null', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue(null);
      expect(await service.getPredictionDistribution('5')).toEqual({
        teamA: 0,
        teamB: 0,
        draw: 0,
      });
    });

    it('returns zeros when result is not an array', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue({
        invalid: true,
      });
      expect(await service.getPredictionDistribution('5')).toEqual({
        teamA: 0,
        teamB: 0,
        draw: 0,
      });
    });

    it('returns zeros when array has fewer than 3 elements', async () => {
      jest.spyOn(service as any, 'viewCall').mockResolvedValue([60]);
      expect(await service.getPredictionDistribution('5')).toEqual({
        teamA: 0,
        teamB: 0,
        draw: 0,
      });
    });
  });

  describe('viewCall - RPC simulation', () => {
    const mockAccount = {
      accountId: () => 'GKEYTESTPUBLICKEY123456',
      sequenceNumber: () => '0',
      incrementSequenceNumber: jest.fn(),
    };

    it('returns null when simulation has no result retval', async () => {
      rpcServerInstance.getAccount.mockResolvedValue(mockAccount);
      rpcServerInstance.simulateTransaction.mockResolvedValue({
        result: null,
      });
      stellarMock.rpc.Api.isSimulationError.mockReturnValue(false);

      expect(await service.getEvent('event-1')).toBeNull();
    });

    it('returns null on simulation error', async () => {
      rpcServerInstance.getAccount.mockResolvedValue(mockAccount);
      rpcServerInstance.simulateTransaction.mockResolvedValue({
        error: 'Contract execution reverted',
      });
      stellarMock.rpc.Api.isSimulationError.mockReturnValue(true);

      expect(await service.getEvent('event-1')).toBeNull();
    });

    it('returns null when getAccount fails on all 3 attempts', async () => {
      rpcServerInstance.getAccount
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'));

      expect(await service.getEvent('event-1')).toBeNull();
      expect(rpcServerInstance.getAccount).toHaveBeenCalledTimes(3);
    });

    it('retries on transient failure and succeeds on second attempt', async () => {
      const retval = { type: 'scval' };
      const mockData = { eventId: '1', title: 'Test' };

      rpcServerInstance.getAccount
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(mockAccount);

      rpcServerInstance.simulateTransaction.mockResolvedValue({
        result: { retval },
      });
      stellarMock.rpc.Api.isSimulationError.mockReturnValue(false);
      stellarMock.scValToNative.mockReturnValue(mockData);

      const result = await service.getEvent('event-1');

      expect(result).toEqual(mockData);
      expect(rpcServerInstance.getAccount).toHaveBeenCalledTimes(2);
    });

    it('returns scValToNative result on successful simulation', async () => {
      const retval = { type: 'contract-scval' };
      const nativeValue = {
        eventId: '10',
        title: 'My Event',
        isActive: true,
      };

      rpcServerInstance.getAccount.mockResolvedValue(mockAccount);
      rpcServerInstance.simulateTransaction.mockResolvedValue({
        result: { retval },
      });
      stellarMock.rpc.Api.isSimulationError.mockReturnValue(false);
      stellarMock.scValToNative.mockReturnValue(nativeValue);

      const result = await service.getEvent('10');

      expect(result).toEqual(nativeValue);
      expect(stellarMock.scValToNative).toHaveBeenCalledWith(retval);
    });
  });
});
