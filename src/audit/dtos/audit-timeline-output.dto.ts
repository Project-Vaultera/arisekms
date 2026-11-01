import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

// Single timeline row for a scoped entity history (e.g. a knowledge document's
// moderation trail). Actor names are joined in so non-admin readers never need
// direct user-directory access.
export class AuditTimelineEntry {
  @Expose()
  @ApiProperty()
  action: string;

  @Expose()
  @ApiProperty({ nullable: true })
  actorId?: number | null;

  @Expose()
  @ApiProperty({ nullable: true })
  actorName?: string | null;

  @Expose()
  @ApiProperty({ nullable: true })
  actorUsername?: string | null;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty({ nullable: true })
  metadata?: Record<string, unknown> | null;
}
