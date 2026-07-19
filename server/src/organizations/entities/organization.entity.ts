import {

  Column,

  CreateDateColumn,

  Entity,

  PrimaryColumn,

} from 'typeorm';

import { JiraAuthType } from '../enums/jira-auth-type.enum';

import { OrganizationStatus } from '../enums/organization-status.enum';



@Entity('organizations')

export class Organization {

  @PrimaryColumn('uuid')

  id: string;



  @Column()

  name: string;



  @Column({

    type: 'enum',

    enum: JiraAuthType,

    default: JiraAuthType.ApiToken,

  })

  jiraAuthType: JiraAuthType;



  @Column({ type: 'varchar', nullable: true })

  jiraEmail: string | null;



  /** AES-256-GCM ciphertext (`iv:authTag:payload`). Never select in API layers. */

  @Column({ type: 'varchar', nullable: true, select: false })

  jiraApiToken: string | null;



  /** Atlassian cloud id for this org's Jira site (`CLOUD_ID`). */

  @Column({ type: 'varchar', nullable: true })

  jiraCloudId: string | null;



  /** Atlassian account id for the API user (`/rest/api/3/myself`). */

  @Column({ type: 'varchar', nullable: true })

  jiraAccountId: string | null;



  @Column({ default: true })

  isActive: boolean;



  @Column({

    type: 'enum',

    enum: OrganizationStatus,

    default: OrganizationStatus.Active,

  })

  status: OrganizationStatus;



  @CreateDateColumn()

  createdAt: Date;

}


