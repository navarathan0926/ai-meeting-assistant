import {
  Allow,
  IsEnum,
  IsObject,
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
import { JiraAdfDocument } from '../../common/jira-document/jira-document.types';
import { isValidAdfDocument } from '../../common/jira-document/blocks-to-adf';

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
      dto.priority !== undefined ||
      dto.finalProjectKey !== undefined
    );
  }

  defaultMessage(): string {
    return 'At least one field must be provided to update.';
  }
}

@ValidatorConstraint({ name: 'isJiraAdfDocument', async: false })
class IsJiraAdfDocumentConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    return isValidAdfDocument(value);
  }

  defaultMessage(): string {
    return 'description must be a valid Jira ADF document.';
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
  @IsObject()
  @Validate(IsJiraAdfDocumentConstraint)
  description?: JiraAdfDocument;

  @IsOptional()
  @IsEnum(ExtractedItemPriority)
  priority?: ExtractedItemPriority;

  @IsOptional()
  @IsString()
  @MinLength(1)
  finalProjectKey?: string;
}
