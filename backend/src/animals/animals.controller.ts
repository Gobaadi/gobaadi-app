import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AnimalsService, Animal } from './animals.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { PaginatedResult } from '../common/paginated-result.interface';

@ApiTags('animals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's animals" })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'breed', required: false })
  @ApiResponse({ status: 200, description: 'List of animals' })
  async getAnimals(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('breed') breed?: string,
  ): Promise<Animal[] | PaginatedResult<Animal>> {
    return this.animalsService.getAnimals(
      user.sub,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
      breed,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an animal by id' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiResponse({ status: 200, description: 'The animal' })
  async getAnimalById(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Animal> {
    return this.animalsService.getAnimalById(user.sub, id);
  }

  @Post('upload-photo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({
    summary: 'Upload an animal photo and get back its S3 URL',
  })
  @ApiResponse({ status: 201, description: 'Image uploaded' })
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('A file is required');
    }
    const url = await this.animalsService.uploadPhoto(file);
    return { url };
  }

  @Post()
  @ApiOperation({ summary: 'Add a new animal' })
  @ApiResponse({ status: 201, description: 'Animal created' })
  async addAnimal(
    @Body() body: CreateAnimalDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Animal> {
    return this.animalsService.addAnimal(user.sub, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned animal' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiResponse({ status: 200, description: 'Animal updated' })
  async updateAnimal(
    @Param('id') id: string,
    @Body() body: UpdateAnimalDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Animal> {
    return this.animalsService.updateAnimal(user.sub, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned animal' })
  @ApiParam({ name: 'id', example: '1' })
  @ApiResponse({ status: 200, description: 'Animal deleted' })
  async deleteAnimal(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ success: boolean }> {
    await this.animalsService.deleteAnimal(user.sub, id);
    return { success: true };
  }
}
