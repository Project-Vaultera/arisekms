import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LeaderboardEntryOutput {
  @Expose()
  @ApiProperty()
  memberName: string;

  @Expose()
  @ApiProperty()
  certificates: number;

  @Expose()
  @ApiProperty()
  points: number;
}
