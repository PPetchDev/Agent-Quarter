import { Module } from '@nestjs/common';
import { CharactersController } from './characters.controller';

@Module({ controllers: [CharactersController] })
export class CharactersModule {}
