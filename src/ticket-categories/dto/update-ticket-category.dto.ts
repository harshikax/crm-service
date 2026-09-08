import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTicketCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_archived?: boolean;
}
