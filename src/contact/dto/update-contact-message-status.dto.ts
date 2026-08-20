import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ContactMessageStatus } from '../../generated/prisma/client';

const readableStatuses = [
  ContactMessageStatus.NEW,
  ContactMessageStatus.READ,
] as const;

export type ReadableContactMessageStatus = (typeof readableStatuses)[number];

export class UpdateContactMessageStatusDto {
  @ApiProperty({ enum: readableStatuses, example: ContactMessageStatus.READ })
  @IsIn(readableStatuses)
  status!: ReadableContactMessageStatus;
}
