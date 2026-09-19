import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { KbVisibility } from '../../common/enums/crm.enum';

export class CreateArticleDto {
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty({ message: 'Category ID is required' })
  category_id: number;

  @IsString()
  @IsNotEmpty({ message: 'Article title is required' })
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Article content/description is required' })
  description: string;

  @IsEnum(KbVisibility)
  @IsOptional()
  visibility?: KbVisibility = KbVisibility.INTERNAL;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  @Type(() => Number)
  tag_ids?: number[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  tags?: string[];
}
