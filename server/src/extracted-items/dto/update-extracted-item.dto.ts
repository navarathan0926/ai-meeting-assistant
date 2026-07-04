import {
  Allow,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ExtractedItemType } from '../enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../enums/extracted-item-priority.enum';

@ValidatorConstraint({ name: 'atLeastOneExtractedItemField', async: false })
class AtLeastOneExtractedItemFieldConstraint
  implements ValidatorConstraintInterface
{
  validate(_: unknown, args?: ValidationArguments) {
    const dto = args?.object as UpdateExtractedItemDto;
    if (!dto) {
      return false;
    }
    return (
      dto.type !== undefined ||
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.priority !== undefined
    );
  }

  defaultMessage(): string {
    return 'At least one field must be provided to update.';
  }
}

export class UpdateExtractedItemDto {
  /** Triggers whole-object validation via class-validator. */
  @Validate(AtLeastOneExtractedItemFieldConstraint)
  @Allow()
  private readonly _atLeastOneField?: true;

  @IsOptional()
  @IsEnum(ExtractedItemType)
  type?: ExtractedItemType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @IsOptional()
  @IsEnum(ExtractedItemPriority)
  priority?: ExtractedItemPriority;
}
