import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class TokenRequestDto {
  @IsNotEmpty({ message: 'client_id is required' })
  @IsString()
  client_id: string;

  @IsNotEmpty({ message: 'client_secret is required' })
  @IsString()
  client_secret: string;

  @IsNotEmpty({ message: 'user_id is required' })
  @IsString()
  user_id: string;

  @IsNotEmpty({ message: 'user_email is required' })
  @IsEmail({}, { message: 'A valid user_email is required' })
  user_email: string;

  @IsNotEmpty({ message: 'user_name is required' })
  @IsString()
  user_name: string;

  @IsOptional()
  @IsString()
  scope?: string;
}
