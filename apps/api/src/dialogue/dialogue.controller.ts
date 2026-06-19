import { Controller, Post, Body } from '@nestjs/common';
import { DialogueService } from './dialogue.service';
import type {
  GenerateOfficeDialogueInput,
  DialogueResponse,
  PlanWorkflowInput,
  PlanWorkflowResponse,
} from './dialogue.service';

@Controller('dialogue')
export class DialogueController {
  constructor(private readonly dialogueService: DialogueService) {}

  @Post('office')
  async generateOfficeDialogue(
    @Body() body: GenerateOfficeDialogueInput,
  ): Promise<DialogueResponse> {
    return this.dialogueService.generateOfficeDialogue(body);
  }

  @Post('plan-workflow')
  async planOfficeWorkflow(
    @Body() body: PlanWorkflowInput,
  ): Promise<PlanWorkflowResponse> {
    return this.dialogueService.planOfficeWorkflow(body);
  }
}
