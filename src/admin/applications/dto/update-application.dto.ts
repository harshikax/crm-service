import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl(
    { require_tld: false },
    {
      message:
        'base_url must be a valid URL (e.g. https://cod.transexpress.lk)',
    },
  )
  base_url?: string;
}

