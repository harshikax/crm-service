import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsIn,
} from 'class-validator';

export class TokenRequestDto {
  @IsNotEmpty({ message: 'client_id is required' })
  @IsString()
  client_id: string;

  @IsNotEmpty({ message: 'client_secret is required' })
  @IsString()
  client_secret: string;

  @IsOptional()
  @IsIn(['authorization_code', 'client_credentials'], {
    message: "grant_type must be 'authorization_code' or 'client_credentials'",
  })
  grant_type?: 'authorization_code' | 'client_credentials';

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsOptional()
  @IsEmail({}, { message: 'A valid user_email is required' })
  user_email?: string;

  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsString()
  scope?: string;
}
