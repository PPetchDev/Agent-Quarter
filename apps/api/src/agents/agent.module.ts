import { Module } from '@nestjs/common';
import { AgentGateway } from './agent.gateway';

@Module({
    providers: [AgentGateway],
    exports: [AgentGateway],
})
export class AgentModule {}
