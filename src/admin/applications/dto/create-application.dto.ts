import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsOptional,
} from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty({ message: 'Application name is required' })
  name: string;

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
