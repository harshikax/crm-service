import { IsEnum, IsNotEmpty } from 'class-validator';
import { TenantStatus } from '../../../common/enums/platform.enum';

export class UpdateTenantStatusDto {
  @IsNotEmpty()
  @IsEnum(
    [TenantStatus.ACTIVE, TenantStatus.SUSPENDED, TenantStatus.ARCHIVED],
    {
      message: 'Status must be ACTIVE, SUSPENDED, or ARCHIVED',
    },
  )
  status: TenantStatus;
}
