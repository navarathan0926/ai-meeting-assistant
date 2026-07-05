import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';
import { emptyAdfDocument } from '../../common/jira-document/blocks-to-adf';

/**
 * Moves description to Jira ADF (jsonb).
 *
 * Existing plain-text values are preserved in descriptionLegacy for manual
 * migration. New rows get an empty ADF placeholder until extraction or an
 * update writes a real document (see ItemExtractionProcessor).
 */
export class AlterExtractedItemDescriptionToJsonb1785000000000
  implements MigrationInterface
{
  name = 'AlterExtractedItemDescriptionToJsonb1785000000000';

  private readonly emptyAdfDefault = `'${JSON.stringify(emptyAdfDocument()).replace(/'/g, "''")}'::jsonb`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn(
      'extracted_items',
      'description',
      'descriptionLegacy',
    );

    await queryRunner.changeColumn(
      'extracted_items',
      'descriptionLegacy',
      new TableColumn({
        name: 'descriptionLegacy',
        type: 'text',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'extracted_items',
      new TableColumn({
        name: 'description',
        type: 'jsonb',
        isNullable: false,
        default: this.emptyAdfDefault,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('extracted_items', 'description');

    await queryRunner.renameColumn(
      'extracted_items',
      'descriptionLegacy',
      'description',
    );

    await queryRunner.changeColumn(
      'extracted_items',
      'description',
      new TableColumn({
        name: 'description',
        type: 'text',
        isNullable: false,
      }),
    );
  }
}
