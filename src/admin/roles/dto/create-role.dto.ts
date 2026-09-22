import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Role name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Role name cannot exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  permission_ids?: number[];
}




