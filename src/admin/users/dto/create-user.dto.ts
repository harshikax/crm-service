import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsInt,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsInt({ message: 'role_id must be an integer' })
  @IsNotEmpty({ message: 'role_id is required' })
  role_id: number;
}

