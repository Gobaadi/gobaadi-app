import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';

class UpdateLanguageDto {
  @ApiProperty({ example: 'en', enum: ['en', 'bn'] })
  @IsIn(['en', 'bn'])
  language: string;
}

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current user's own profile" })
  @ApiResponse({ status: 200, description: 'The user profile' })
  async getMe(
    @CurrentUser() user: JwtPayload,
  ): Promise<Omit<User, 'password'>> {
    const found = await this.usersService.findById(user.sub);
    return found as Omit<User, 'password'>;
  }

  @Patch('me')
  @ApiOperation({ summary: "Update the current user's own profile" })
  @ApiResponse({ status: 200, description: 'The updated user profile' })
  async updateMe(
    @Body() body: UpdateProfileDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Omit<User, 'password'>> {
    return this.usersService.updateProfile(user.sub, body);
  }

  @Patch('me/language')
  @ApiOperation({ summary: 'Update preferred language' })
  @ApiResponse({ status: 200, description: 'Language updated' })
  async updateLanguage(
    @Body() body: UpdateLanguageDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean; language: string }> {
    await this.usersService.updateProfile(user.sub, {
      language: body.language,
    } as any);
    return { success: true, language: body.language };
  }

  @Post('me/photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload a profile photo and save it to the profile' })
  @ApiResponse({ status: 201, description: 'Photo uploaded' })
  async uploadMyPhoto(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    const url = await this.usersService.uploadPhoto(file);
    await this.usersService.updateProfile(user.sub, { profilePhoto: url });
    return { url };
  }
}
