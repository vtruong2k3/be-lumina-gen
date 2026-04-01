import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({ example: 'prompt_123' })
  @IsString()
  @IsNotEmpty()
  promptId!: string;
}
