import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AuditLogOutput {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiPropertyOptional()
  @Expose()
  actorId?: number | null;

  @ApiProperty()
  @Expose()
  action: string;

  @ApiProperty()
  @Expose()
  entityType: string;

  @ApiPropertyOptional()
  @Expose()
  entityId?: string | null;

  @ApiPropertyOptional()
  @Expose()
  statusCode?: number | null;

  @ApiPropertyOptional()
  @Expose()
  outcome?: string | null;

  @ApiPropertyOptional()
  @Expose()
  metadata?: Record<string, unknown> | null;

  @ApiProperty()
  @Expose()
  createdAt: Date;
}
