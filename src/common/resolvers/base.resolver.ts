import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { HmacAuthGuard } from '../../modules/auth/guards/hmac-auth.guard';

@UseGuards(HmacAuthGuard)
@Resolver()
export abstract class BaseResolver {}
