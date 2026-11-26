import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, Length } from 'class-validator';

import { CreateUserInput } from './user-create-input.dto';

// An invited user sets their own password from the mailed link, so the admin
// no longer has to invent one. Supplying a password is still allowed and skips
// the mail, for accounts where nobody will read the inbox.
export class InviteUserInput extends PartialType(CreateUserInput) {
  @ApiProperty({
    required: false,
    description: 'Omit to have the user choose one from a mailed link.',
  })
  @IsOptional()
  @Length(6, 100)
  password?: string;
}