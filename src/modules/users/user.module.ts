import { forwardRef, Module } from '@nestjs/common';
import { DataloaderModule } from 'src/dataloader/dataloader.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

@Module({
  imports: [PrismaModule, DataloaderModule, forwardRef(() => CommonModule)],
  providers: [UserResolver, UserService],
  exports: [UserService],
})
export class UserModule {}
