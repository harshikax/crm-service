import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { KbVisibility } from '../../common/enums/crm.enum';

export class ArticleListDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tag_id?: number;

  @IsOptional()
  @IsEnum(KbVisibility)
  visibility?: KbVisibility;
}
