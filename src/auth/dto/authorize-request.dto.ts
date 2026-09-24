import {
  IsNotEmpty,
  IsString,
  IsUrl,
  IsOptional,
  IsEmail,
} from 'class-validator';

export class AuthorizeRequestDto {
  @IsNotEmpty({ message: 'client_id is required' })
  @IsString()
  client_id: string;

  @IsNotEmpty({ message: 'redirect_uri is required' })
  @IsUrl({ require_tld: false }, { message: 'redirect_uri must be a valid URL' })
  redirect_uri: string;

  @IsNotEmpty({ message: 'user_id is required' })
  @IsString()
  user_id: string;

  @IsOptional()
  @IsEmail({}, { message: 'user_email must be a valid email' })
  user_email?: string;

  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsString()
  scope?: string;
}
