import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AnimalsService } from './animals.service';
import { AnimalsController } from './animals.controller';
import { Animal } from './animal.entity';
import { S3Module } from '../s3/s3.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Animal]),
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    S3Module,
    CloudinaryModule,
  ],
  controllers: [AnimalsController],
  providers: [AnimalsService],
  exports: [AnimalsService],
})
export class AnimalsModule {}
