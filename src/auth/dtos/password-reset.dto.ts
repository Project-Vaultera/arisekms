import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ForgotPasswordInput {
  @ApiProperty({
    description: 'Registered address; unknown values still return 202.',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordInput {
  @ApiProperty({ description: 'Raw token from the mailed link.' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ minLength: 6, maxLength: 100 })
  @IsString()
  @Length(6, 100)
  password: string;
}

// Invite accept is a reset by another name: same shape, different token kind.
export class AcceptInviteInput extends ResetPasswordInput {}