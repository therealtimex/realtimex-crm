import { supabase } from '../../components/atomic-crm/providers/supabase/supabase';
import axios from 'axios';

/**
 * AgentService
 * 
 * Orchestrates the AI processing loop (Local Agent).
 * Claims activities from the queue, processes them using the SDK,
 * and logs thinking events to the LiveTerminal.
 */
export class AgentService {
    private static isRunning = false;
    private static machineId = `crm-agent-${Math.random().toString(36).substring(2, 9)}`;
    private static pollTimer: any = null;

    /**
     * Start the agent processing loop
     */
    static start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[AgentService] Starting AI Agent loop (Machine ID: ${this.machineId})`);
        this.loop();
    }

    /**
     * Stop the agent processing loop
     */
    static stop() {
        this.isRunning = false;
        if (this.pollTimer) clearTimeout(this.pollTimer);
        console.log('[AgentService] AI Agent loop stopped');
    }

    /**
     * The core processing loop
     */
    private static async loop() {
        if (!this.isRunning) return;

        try {
            await this.processNextTask();
        } catch (error) {
            console.error('[AgentService] Loop error:', error);
        }

        // Poll every 5 seconds if running
        if (this.isRunning) {
            this.pollTimer = setTimeout(() => this.loop(), 5000);
        }
    }

    /**
     * Fetch, claim, and process the next pending task
     */
    private static async processNextTask() {
        // 1. Claim a task via RPC
        const { data: task, error: claimError } = await supabase.rpc('claim_next_task_standard', {
            p_machine_id: this.machineId
        });

        if (claimError) {
            console.error('[AgentService] Claim failed:', claimError);
            return;
        }

        if (!task || task.length === 0) {
            return; // No pending tasks
        }

        const currentTask = task[0];
        const activityId = currentTask.id;

        try {
            await this.logEvent(activityId, 'thinking', `Processing activity: ${currentTask.type}`);

            // 2. Process based on type
            let result = null;
            if (currentTask.type === 'smart_ingestion') {
                result = await this.handleSmartIngestion(activityId, currentTask.raw_data);
            } else {
                await this.logEvent(activityId, 'analyzing', `Unknown task type: ${currentTask.type}`);
                result = { error: 'Unknown task type' };
            }

            // 3. Mark as completed
            await supabase.rpc('complete_task_standard', {
                p_task_id: activityId,
                p_machine_id: this.machineId,
                p_result: result
            });

            await this.logEvent(activityId, 'success', `Successfully processed ${currentTask.type}`);

        } catch (error: any) {
            console.error(`[AgentService] Processing failed for ${activityId}:`, error);

            await this.logEvent(activityId, 'error', `Fatal error: ${error.message}`);

            await supabase.rpc('fail_task_standard', {
                p_task_id: activityId,
                p_machine_id: this.machineId,
                p_error_message: error.message
            });
        }
    }

    /**
     * Handle Smart Ingestion (Entity Extraction)
     */
    private static async handleSmartIngestion(activityId: string, rawData: any) {
        await this.logEvent(activityId, 'thinking', 'Extracting entities and sentiment...');

        // Call the backend proxy for LLM chat
        const response = await axios.post('/api/sdk/chat', {
            messages: [
                {
                    role: 'system',
                    content: 'You are a CRM Smart Ingestion Agent. Extract structured information from raw data. Output JSON only.'
                },
                {
                    role: 'user',
                    content: `Analyze this raw data and extract Contact Name, Company, Title, and Sentiment. Data: ${JSON.stringify(rawData)}`
                }
            ]
        });

        if (!response.data.success) {
            throw new Error(response.data.message || 'LLM call failed');
        }

        const intelligence = response.data.content;
        await this.logEvent(activityId, 'acting', `Extraction complete. Sentiment: ${intelligence.sentiment || 'Neutral'}`);

        return { intelligence };
    }

    /**
     * Log an event to the processing_events table
     */
    private static async logEvent(activityId: string, type: string, content: string) {
        await supabase.from('processing_events').insert({
            activity_id: activityId,
            event_type: type,
            content: content
        });
    }
}
