import { Module } from '@nestjs/common';
import { ContractModule } from '../contract/contract.module';
import {
  AdminCreatorEventsController,
  CreatorEventsController,
  PublicCreatorEventsController,
} from './creator-events.controller';
import { CreatorEventsService } from './creator-events.service';

@Module({
  imports: [ContractModule],
  controllers: [
    CreatorEventsController,
    AdminCreatorEventsController,
    PublicCreatorEventsController,
  ],
  providers: [CreatorEventsService],
})
export class CreatorEventsModule {}
