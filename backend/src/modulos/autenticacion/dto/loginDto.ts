import { Transform } from "class-transformer";
import { IsString, MaxLength } from "class-validator";

export class LoginDto {
  @IsString()
  @MaxLength(32)
  cedula: string;

  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  password: string;
}
