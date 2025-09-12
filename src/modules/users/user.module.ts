import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommonModule } from '../../common/services/common.module';
import { DataloaderModule } from '../../dataloader/dataloader.module';
import { UserResolver } from './user.resolver';
import { UserService } from './user.service';

@Module({
  imports: [PrismaModule, DataloaderModule, forwardRef(() => CommonModule)],
  providers: [UserResolver, UserService],
  exports: [UserService],
})
export class UserModule {}
