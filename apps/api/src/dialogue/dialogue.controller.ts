import { Controller, Post, Body } from '@nestjs/common';
import { DialogueService } from './dialogue.service';
import type { DialogueResponse, PlanWorkflowResponse } from './dialogue.service';
import { OfficeDialogueDto, PlanWorkflowDto } from './dto';

@Controller('dialogue')
export class DialogueController {
  constructor(private readonly dialogueService: DialogueService) {}

  @Post('office')
  async generateOfficeDialogue(@Body() body: OfficeDialogueDto): Promise<DialogueResponse> {
    return this.dialogueService.generateOfficeDialogue(body);
  }

  @Post('plan-workflow')
  async planOfficeWorkflow(@Body() body: PlanWorkflowDto): Promise<PlanWorkflowResponse> {
    return this.dialogueService.planOfficeWorkflow(body);
  }
}
