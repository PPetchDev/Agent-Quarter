import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CHARACTER_TEMPLATES, CHARACTER_MOOD_REGISTRY, getCharacterTemplate } from '@squad/core';

@Controller('characters')
export class CharactersController {
  @Get()
  findAll() {
    return CHARACTER_TEMPLATES.map(t => ({
      ...t,
      moodEntry: CHARACTER_MOOD_REGISTRY[t.characterId],
    }));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const template = getCharacterTemplate(id);
    if (!template) throw new NotFoundException(`Character '${id}' not found`);
    return { ...template, moodEntry: CHARACTER_MOOD_REGISTRY[id] };
  }
}
