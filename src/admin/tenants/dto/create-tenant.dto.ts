import {
  IsString,
  IsNotEmpty,
  Matches,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  MaxLength,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";
import { Type } from "class-transformer";
import { CreateApplicationDto } from "../../applications/dto/create-application.dto";

export const RESERVED_SLUGS = [
  "api",
  "oauth",
  "admin",
  "www",
  "public",
  "auth",
  "webhook",
  "app",
  "system",
  "platform",
  "root",
] as const;

export function IsNotReservedSlug(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isNotReservedSlug",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== "string") return false;
          return !RESERVED_SLUGS.includes(value.toLowerCase().trim() as any);
        },
        defaultMessage(args: ValidationArguments) {
          return "Slug '" + args.value + "' is a reserved system keyword and cannot be used";
        },
      },
    });
  };
}

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50, { message: "Slug cannot exceed 50 characters" })
  @Matches(/^[a-z][a-z0-9_]{1,49}$/, {
    message:
      "Slug must start with a lowercase letter, contain only lowercase letters, numbers, and underscores (no hyphens), and be 2 to 50 characters",
  })
  @IsNotReservedSlug()
  slug: string;

  @IsArray()
  @ArrayMinSize(1, {
    message: "At least one application is required when creating a tenant",
  })
  @ValidateNested({ each: true })
  @Type(() => CreateApplicationDto)
  applications: CreateApplicationDto[];
}
