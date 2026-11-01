import { Test, TestingModule } from '@nestjs/testing';

import { AuditService } from '../../audit/services/audit.service';
import { ROLE } from '../../auth/constants/role.constant';
import * as fileStorage from '../../shared/files/file-storage';
import { AppLogger } from '../../shared/logger/logger.service';
import { RequestContext } from '../../shared/request-context/request-context.dto';
import { UserService } from '../../user/services/user.service';
import { KnowledgeDocument, KnowledgeStatus } from '../entities/knowledge-document.entity';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeAclService } from './knowledge-acl.service';

describe('KnowledgeService moderation', () => {
  let service: KnowledgeService;

  const qb: any = {};
  const mockedRepository = {
    save: jest.fn((doc) => Promise.resolve(doc)),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    getById: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };
  const mockedUserService = {
    getUserById: jest.fn(),
  };
  const mockedAuditService = {
    record: jest.fn(),
    timeline: jest.fn(),
  };

  const mockedLogger = { setContext: jest.fn(), log: jest.fn() };

  const chain = () => {
    for (const m of ['leftJoin', 'where', 'orWhere', 'orderBy', 'take', 'skip']) {
      qb[m] = jest.fn().mockReturnValue(qb);
    }
    qb.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  };
  chain();

  beforeEach(async () => {
    jest.spyOn(fileStorage, 'persistUpload').mockReturnValue('stored-doc.pdf');
    jest.spyOn(fileStorage, 'removeUploadFile').mockReturnValue(undefined);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: KnowledgeRepository, useValue: mockedRepository },
        { provide: UserService, useValue: mockedUserService },
        { provide: KnowledgeAclService, useValue: new KnowledgeAclService() },
        { provide: AuditService, useValue: mockedAuditService },
        { provide: AppLogger, useValue: mockedLogger },
      ],
    }).compile();

    service = moduleRef.get<KnowledgeService>(KnowledgeService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const ctx = new RequestContext();
  const member = { id: 6, roles: [ROLE.ARISE_MEMBER] };
  const otherMember = { id: 7, roles: [ROLE.ARISE_MEMBER] };
  const secretariat = { id: 8, roles: [ROLE.ARISE_SECRETARIAT] };
  const analyst = { id: 9, roles: [ROLE.ARISE_DATA_ANALYST] };

  function doc(overrides: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
    return {
      id: 1,
      title: 'Guide',
      description: 'desc',
      category: 'Manual',
      kind: 'PDF',
      originalName: 'guide.pdf',
      storedName: 'stored.pdf',
      mimeType: 'application/pdf',
      size: 10,
      status: KnowledgeStatus.SUBMITTED,
      rejectReason: null,
      author: { id: 6 } as never,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as KnowledgeDocument;
  }

  const file = { originalname: 'guide.pdf', mimetype: 'application/pdf', size: 10, buffer: Buffer.from('x') } as Express.Multer.File;

  describe('createDocument', () => {
    it('lands member uploads as submitted and audits the upload', async () => {
      mockedUserService.getUserById.mockResolvedValue({ id: 6 });
      const withCtx = { ...ctx, user: member } as never;

      await service.createDocument(withCtx, { title: 'Guide', category: 'Manual' }, file);

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: KnowledgeStatus.SUBMITTED }),
      );
      expect(mockedAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        'KNOWLEDGE_UPLOADED',
        'knowledge',
        expect.anything(),
        expect.objectContaining({ status: KnowledgeStatus.SUBMITTED }),
      );
    });

    it('auto-approves staff uploads', async () => {
      mockedUserService.getUserById.mockResolvedValue({ id: 8 });
      const withCtx = { ...ctx, user: secretariat } as never;

      await service.createDocument(withCtx, { title: 'Guide', category: 'Manual' }, file);

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: KnowledgeStatus.APPROVED }),
      );
    });

    it('rejects analyst uploads', async () => {
      const withCtx = { ...ctx, user: analyst } as never;

      await expect(
        service.createDocument(withCtx, { title: 'Guide', category: 'Manual' }, file),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('visibility', () => {
    it('lets members read their own submitted docs', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: member } as never;

      const out = await service.getDocumentById(withCtx, 1);
      expect(out.title).toEqual('Guide');
    });

    it('hides other members’ submitted docs', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: otherMember } as never;

      await expect(service.getDocumentById(withCtx, 1)).rejects.toThrow('Unauthorized');
    });

    it('shows approved docs to other members', async () => {
      mockedRepository.getById.mockResolvedValue(doc({ status: KnowledgeStatus.APPROVED }));
      const withCtx = { ...ctx, user: otherMember } as never;

      const out = await service.getDocumentById(withCtx, 1);
      expect(out.status).toEqual(KnowledgeStatus.APPROVED);
    });

    it('hides submitted docs from analysts', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: analyst } as never;

      await expect(service.getDocumentById(withCtx, 1)).rejects.toThrow('Unauthorized');
    });

    it('scopes the member list to approved plus own docs', async () => {
      const withCtx = { ...ctx, user: member } as never;

      await service.getDocuments(withCtx, 100, 0);

      expect(mockedRepository.createQueryBuilder).toHaveBeenCalledWith('doc');
      expect(qb.orWhere).toHaveBeenCalledWith('author.id = :uid', { uid: 6 });
    });

    it('lists everything for reviewers', async () => {
      mockedRepository.findAndCount.mockResolvedValue([[], 0]);
      const withCtx = { ...ctx, user: secretariat } as never;

      await service.getDocuments(withCtx, 100, 0);

      expect(mockedRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('updateDocument', () => {
    it('lets authors edit their own submitted docs', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: member } as never;

      await service.updateDocument(withCtx, 1, { title: 'New title' });

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New title', status: KnowledgeStatus.SUBMITTED }),
      );
      expect(mockedAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        'KNOWLEDGE_EDITED',
        'knowledge',
        '1',
        expect.anything(),
      );
    });

    it('resubmits rejected docs and clears the reason', async () => {
      mockedRepository.getById.mockResolvedValue(doc({ status: KnowledgeStatus.REJECTED, rejectReason: 'Too short' }));
      const withCtx = { ...ctx, user: member } as never;

      await service.updateDocument(withCtx, 1, { title: 'Fixed' });

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: KnowledgeStatus.SUBMITTED, rejectReason: null }),
      );
      expect(mockedAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        'KNOWLEDGE_RESUBMITTED',
        'knowledge',
        '1',
        expect.anything(),
      );
    });

    it('blocks authors from editing approved docs', async () => {
      mockedRepository.getById.mockResolvedValue(doc({ status: KnowledgeStatus.APPROVED }));
      const withCtx = { ...ctx, user: member } as never;

      await expect(service.updateDocument(withCtx, 1, { title: 'Sneaky' })).rejects.toThrow('Unauthorized');
    });

    it('blocks edits of other members’ docs', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: otherMember } as never;

      await expect(service.updateDocument(withCtx, 1, { title: 'Sneaky' })).rejects.toThrow('Unauthorized');
    });
  });

  describe('deleteDocument', () => {
    it('lets authors delete their own submitted docs and audits', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: member } as never;

      await service.deleteDocument(withCtx, 1);

      expect(mockedRepository.remove).toHaveBeenCalled();
      expect(mockedAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        'KNOWLEDGE_DELETED',
        'knowledge',
        '1',
        expect.anything(),
      );
    });

    it('blocks authors from deleting approved docs', async () => {
      mockedRepository.getById.mockResolvedValue(doc({ status: KnowledgeStatus.APPROVED }));
      const withCtx = { ...ctx, user: member } as never;

      await expect(service.deleteDocument(withCtx, 1)).rejects.toThrow('Unauthorized');
    });
  });

  describe('reviewDocument', () => {
    it('approves submitted docs', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: secretariat } as never;

      await service.reviewDocument(withCtx, 1, { status: KnowledgeStatus.APPROVED });

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: KnowledgeStatus.APPROVED, rejectReason: null }),
      );
      expect(mockedAuditService.record).toHaveBeenCalledWith(
        expect.anything(),
        'KNOWLEDGE_APPROVED',
        'knowledge',
        '1',
        expect.anything(),
      );
    });

    it('rejects with a required reason', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: secretariat } as never;

      await service.reviewDocument(withCtx, 1, { status: KnowledgeStatus.REJECTED, reason: 'Off-topic' });

      expect(mockedRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: KnowledgeStatus.REJECTED, rejectReason: 'Off-topic' }),
      );
    });

    it('refuses rejections without a reason', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: secretariat } as never;

      await expect(
        service.reviewDocument(withCtx, 1, { status: KnowledgeStatus.REJECTED }),
      ).rejects.toThrow('A reason is required to reject.');
    });

    it('refuses to decide twice', async () => {
      mockedRepository.getById.mockResolvedValue(doc({ status: KnowledgeStatus.APPROVED }));
      const withCtx = { ...ctx, user: secretariat } as never;

      await expect(
        service.reviewDocument(withCtx, 1, { status: KnowledgeStatus.REJECTED, reason: 'x' }),
      ).rejects.toThrow('Document has already been decided.');
    });
  });

  describe('getHistory', () => {
    it('returns the audit trail to the author', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      mockedAuditService.timeline.mockResolvedValue([{ action: 'KNOWLEDGE_UPLOADED' }]);
      const withCtx = { ...ctx, user: member } as never;

      const items = await service.getHistory(withCtx, 1);

      expect(mockedAuditService.timeline).toHaveBeenCalledWith(
        'knowledge',
        '1',
        expect.arrayContaining(['KNOWLEDGE_UPLOADED', 'KNOWLEDGE_APPROVED']),
      );
      expect(items).toHaveLength(1);
    });

    it('hides the trail for unrelated members', async () => {
      mockedRepository.getById.mockResolvedValue(doc());
      const withCtx = { ...ctx, user: otherMember } as never;

      await expect(service.getHistory(withCtx, 1)).rejects.toThrow('Unauthorized');
    });
  });
});
