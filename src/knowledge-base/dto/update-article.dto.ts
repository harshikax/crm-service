import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { KbVisibility } from '../../common/enums/crm.enum';

export class UpdateArticleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(KbVisibility)
  visibility?: KbVisibility;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  tag_ids?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
