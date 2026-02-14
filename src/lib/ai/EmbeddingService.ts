import { supabase } from '../../components/atomic-crm/providers/supabase/supabase';
import axios from 'axios';

type TaskContext = {
    taskText: string;
    contactName: string | null;
    companyName: string | null;
    dealName: string | null;
};

/**
 * EmbeddingService
 *
 * Logic to flatten CRM entities into semantic strings and
 * compute/store embeddings for semantic search.
 */
export class EmbeddingService {
    // Cache for AI settings (5 minute TTL)
    private static aiSettingsCache: { data: any; timestamp: number } | null = null;
    private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
    private static readonly EMBEDDING_TIMEOUT_MS = 60000; // 60 seconds (generous timeout for AI providers)
    private static readonly EMBEDDING_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    private static buildFullName(firstName?: string | null, lastName?: string | null): string | null {
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        return fullName || null;
    }

    private static formatDateForEmbedding(value?: string | null): string | null {
        if (!value) return null;

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;

        return this.EMBEDDING_DATE_FORMATTER.format(parsed);
    }

    /**
     * Fetch user's AI settings from database (with caching)
     */
    private static async fetchAISettings() {
        // Check cache first
        if (this.aiSettingsCache) {
            const age = Date.now() - this.aiSettingsCache.timestamp;
            if (age < this.CACHE_TTL_MS) {
                return this.aiSettingsCache.data;
            }
        }
        // Fetch from database and cache result
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return {};

            const { data } = await supabase
                .from('ai_settings')
                .select('embedding_provider, embedding_model')
                .eq('user_id', user.id)
                .maybeSingle();

            const settings = data || {};

            // Cache the result
            this.aiSettingsCache = {
                data: settings,
                timestamp: Date.now()
            };

            return settings;
        } catch (error) {
            console.warn('[EmbeddingService] Failed to fetch AI settings:', error);
            return {};
        }
    }

    /**
     * Fetch tag names for tag IDs
     */
    private static async fetchTagNames(tagIds: number[]): Promise<string[]> {
        if (!tagIds || tagIds.length === 0) return [];

        try {
            const { data: tags, error } = await supabase
                .from('tags')
                .select('name')
                .in('id', tagIds);

            if (error) {
                console.warn('[EmbeddingService] Failed to fetch tag names:', error);
                return [];
            }

            return tags.map(t => t.name);
        } catch (error) {
            console.warn('[EmbeddingService] Error fetching tag names:', error);
            return [];
        }
    }

    /**
     * Fetch contact context for tasks (contact name)
     */
    private static async fetchContactContext(contactId: number): Promise<string | null> {
        if (!contactId) return null;

        try {
            const { data: contact, error } = await supabase
                .from('contacts')
                .select('first_name, last_name')
                .eq('id', contactId)
                .maybeSingle();

            if (error || !contact) {
                console.warn('[EmbeddingService] Failed to fetch contact context:', error);
                return null;
            }

            return this.buildFullName(contact.first_name, contact.last_name);
        } catch (error) {
            console.warn('[EmbeddingService] Error fetching contact context:', error);
            return null;
        }
    }

    /**
     * Fetch company context for tasks (company name)
     */
    private static async fetchCompanyContext(companyId: number): Promise<string | null> {
        if (!companyId) return null;

        try {
            const { data: company, error } = await supabase
                .from('companies')
                .select('name')
                .eq('id', companyId)
                .maybeSingle();

            if (error || !company) {
                console.warn('[EmbeddingService] Failed to fetch company context:', error);
                return null;
            }

            return company.name || null;
        } catch (error) {
            console.warn('[EmbeddingService] Error fetching company context:', error);
            return null;
        }
    }

    /**
     * Fetch deal context for tasks (deal name)
     */
    private static async fetchDealContext(dealId: number): Promise<string | null> {
        if (!dealId) return null;

        try {
            const { data: deal, error } = await supabase
                .from('deals')
                .select('name')
                .eq('id', dealId)
                .maybeSingle();

            if (error || !deal) {
                console.warn('[EmbeddingService] Failed to fetch deal context:', error);
                return null;
            }

            return deal.name || null;
        } catch (error) {
            console.warn('[EmbeddingService] Error fetching deal context:', error);
            return null;
        }
    }

    /**
     * Fetch task context for taskNotes (task text and contact)
     */
    private static async fetchTaskContext(taskId: number): Promise<TaskContext | null> {
        if (!taskId) return null;

        try {
            const { data: taskSummary, error: summaryError } = await supabase
                .from('tasks_summary')
                .select('text, contact_first_name, contact_last_name, company_name, deal_name')
                .eq('id', taskId)
                .maybeSingle();

            if (!summaryError && taskSummary) {
                return {
                    taskText: taskSummary.text || '',
                    contactName: this.buildFullName(taskSummary.contact_first_name, taskSummary.contact_last_name),
                    companyName: taskSummary.company_name || null,
                    dealName: taskSummary.deal_name || null,
                };
            }

            if (summaryError) {
                console.warn('[EmbeddingService] Failed to fetch task context from tasks_summary, falling back to tasks table:', summaryError);
            }

            // Fallback for databases where tasks_summary is missing or stale
            const { data: task, error } = await supabase
                .from('tasks')
                .select('text, contact_id, company_id, deal_id')
                .eq('id', taskId)
                .maybeSingle();

            if (error || !task) {
                console.warn('[EmbeddingService] Failed to fetch task context:', error);
                return null;
            }

            const [contactName, companyName, dealName] = await Promise.all([
                task.contact_id ? this.fetchContactContext(task.contact_id) : Promise.resolve(null),
                task.company_id ? this.fetchCompanyContext(task.company_id) : Promise.resolve(null),
                task.deal_id ? this.fetchDealContext(task.deal_id) : Promise.resolve(null),
            ]);

            return {
                taskText: task.text || '',
                contactName,
                companyName,
                dealName,
            };
        } catch (error) {
            console.warn('[EmbeddingService] Error fetching task context:', error);
            return null;
        }
    }

    /**
     * Embed a CRM record
     * @returns true if embedding succeeded, false otherwise (fire-and-forget safe)
     */
    static async embedRecord(type: 'contact' | 'company' | 'deal' | 'task' | 'taskNote' | 'note', record: any): Promise<boolean> {
        // Allow disabling embeddings via environment variable
        if (import.meta.env.VITE_DISABLE_EMBEDDINGS === 'true') {
            console.log('[EmbeddingService] Embeddings disabled via VITE_DISABLE_EMBEDDINGS');
            return false;
        }

        // Ensure record has an ID before embedding
        if (!record.id) {
            console.warn(`[EmbeddingService] Skipping embedding for ${type} - missing ID`, record);
            return false;
        }

        // Enrich record with contextual data for embedding
        let enrichedRecord = record;

        // Fetch tag names if present
        if (record.tags && record.tags.length > 0) {
            const tagNames = await this.fetchTagNames(record.tags);
            enrichedRecord = { ...enrichedRecord, tagNames };
        }

        // Fetch relationship context for tasks
        if (type === 'task') {
            // 1. Extract inline fields
            let contactName = enrichedRecord.contactName ||
                             this.buildFullName(enrichedRecord.contact_first_name, enrichedRecord.contact_last_name) ||
                             null;
            let companyName = enrichedRecord.companyName || enrichedRecord.company_name || null;
            let dealName = enrichedRecord.dealName || enrichedRecord.deal_name || null;

            // 2. Fetch from tasks_summary (canonical context) if ID exists and we're missing anything
            if (record.id && (!contactName || !companyName || !dealName)) {
                const taskContext = await this.fetchTaskContext(record.id);
                if (taskContext) {
                    contactName = contactName || taskContext.contactName;
                    companyName = companyName || taskContext.companyName;
                    dealName = dealName || taskContext.dealName;
                }
            }

            // 3. Final fallback to individual entity fetches if still missing
            if (!contactName && record.contact_id) {
                contactName = await this.fetchContactContext(record.contact_id);
            }
            if (!companyName && record.company_id) {
                companyName = await this.fetchCompanyContext(record.company_id);
            }
            if (!dealName && record.deal_id) {
                dealName = await this.fetchDealContext(record.deal_id);
            }

            enrichedRecord = {
                ...enrichedRecord,
                contactName,
                companyName,
                dealName,
            };
        }

        // Fetch task context for taskNotes
        if (type === 'taskNote' && record.task_id) {
            const taskContext = await this.fetchTaskContext(record.task_id);
            if (taskContext) {
                enrichedRecord = {
                    ...enrichedRecord,
                    taskText: taskContext.taskText,
                    contactName: taskContext.contactName,
                    companyName: taskContext.companyName,
                    dealName: taskContext.dealName,
                };
            }
        }

        const content = this.flattenRecord(type, enrichedRecord);
        if (!content) return false;

        try {
            // Log what we're actually embedding to verify completeness
            console.log(`[EmbeddingService] Content to embed (${type} ${record.id}):`, content);

            // 1. Fetch user's AI settings (embedding provider/model)
            const settings = await this.fetchAISettings();

            // 2. Get embedding from SDK (via backend proxy)
            const response = await axios.post('/api/sdk/embed', {
                content,
                settings  // Pass user's embedding settings
            }, {
                timeout: this.EMBEDDING_TIMEOUT_MS
            });

            if (!response.data.success) {
                throw new Error(response.data.message || 'Embedding failed');
            }

            const { embedding, model } = response.data;

            if (!embedding || !Array.isArray(embedding)) {
                throw new Error('Invalid embedding format');
            }

            // 2. Format embedding as pgvector string (like alchemy)
            const embeddingStr = `[${embedding.join(',')}]`;

            // Get dimension from embedding array
            const dimensions = embedding.length;

            console.log(`[EmbeddingService] Storing embedding: model=${model}, dimensions=${dimensions}`);

            // 3. Upsert into entity_vectors
            // Using (entity_type, entity_id, model) constraint to allow multiple models per entity
            const { error: upsertError } = await supabase.from('entity_vectors').upsert({
                entity_type: type,
                entity_id: record.id,
                content: content,
                embedding: embeddingStr,  // Use string format for pgvector
                model: model,
                updated_at: new Date().toISOString()
            }, { onConflict: 'entity_type,entity_id,model' });

            if (upsertError) {
                console.error(`[EmbeddingService] ❌ Upsert failed:`, upsertError);
                throw new Error(`Failed to store embedding: ${upsertError.message}`);
            }

            console.log(`[EmbeddingService] ✅ Embedded ${type}: ${record.id}`);
            return true;
        } catch (error: any) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                console.warn(`[EmbeddingService] ⚠️ Embedding timeout for ${type} - embedding provider not configured or RealTimeX Desktop not running`);
            } else {
                const errorMessage = error.response?.data?.message || error.message || error;
                console.error(`[EmbeddingService] ❌ Failed to embed ${type}:`, errorMessage);
            }
            // Don't throw - return false for fire-and-forget safety
            // Callers can check return value if they need to track success/failure
            return false;
        }
    }

    /**
     * Flatten a record into a searchable string
     */
    private static flattenRecord(type: string, record: any): string | null {
        switch (type) {
            case 'contact': {
                // Extract emails from JSONB array
                const emails = record.email_jsonb || [];
                const emailStrings = Array.isArray(emails)
                    ? emails.map((e: any) => e.email).filter(Boolean)
                    : [];

                // Extract phones from JSONB array
                const phones = record.phone_jsonb || [];
                const phoneStrings = Array.isArray(phones)
                    ? phones.map((p: any) => p.number).filter(Boolean)
                    : [];

                const parts = [
                    // Basic info
                    `${record.first_name} ${record.last_name}`,
                    record.title ? `Title: ${record.title}` : null,
                    record.company_name ? `Company: ${record.company_name}` : 'Individual',

                    // Contact info - use JSONB arrays if available, fallback to old fields
                    emailStrings.length > 0 ? `Email: ${emailStrings.join(', ')}` : (record.email ? `Email: ${record.email}` : null),
                    phoneStrings.length > 0 ? `Phone: ${phoneStrings.join(', ')}` : (record.phone_1_number ? `Phone: ${record.phone_1_number}` : null),
                    record.linkedin_url ? `LinkedIn: ${record.linkedin_url}` : null,

                    // Status and acquisition
                    record.status ? `Status: ${record.status}` : null,
                    record.acquisition ? `Source: ${record.acquisition}` : null,

                    // Background - most important for semantic understanding
                    record.background ? `Background: ${record.background}` : null,

                    // Tags - use tag names instead of IDs for semantic search
                    (record.tagNames && record.tagNames.length > 0) ? `Tags: ${record.tagNames.join(', ')}` : null,
                ];

                return parts.filter(Boolean).join('. ') + '.';
            }
            case 'company': {
                // Extract social profiles from JSONB
                const socialProfiles = record.social_profiles || {};
                const socialLinks: string[] = [];
                if (socialProfiles.linkedin) socialLinks.push(`LinkedIn: ${socialProfiles.linkedin}`);
                if (socialProfiles.twitter) socialLinks.push(`Twitter: ${socialProfiles.twitter}`);
                if (socialProfiles.facebook) socialLinks.push(`Facebook: ${socialProfiles.facebook}`);
                // Fallback to linkedin_url if social_profiles is empty
                if (socialLinks.length === 0 && record.linkedin_url) {
                    socialLinks.push(`LinkedIn: ${record.linkedin_url}`);
                }

                const companyParts = [
                    // Basic info
                    record.name,
                    record.industry ? `Industry: ${record.industry}` : (record.sector ? `Sector: ${record.sector}` : null),
                    record.company_type ? `Type: ${record.company_type}` : null,

                    // Size and maturity
                    record.employee_count ? `Size: ${record.employee_count} employees` : (record.size ? `Size: ${record.size} employees` : null),
                    record.founded_year ? `Founded: ${record.founded_year}` : null,

                    // Contact info
                    record.email ? `Email: ${record.email}` : null,
                    record.website ? `Website: ${record.website}` : null,
                    record.phone_number ? `Phone: ${record.phone_number}` : null,
                    ...socialLinks,

                    // Location (full address with zipcode)
                    record.address ? `Address: ${record.address}` : null,
                    record.city ? `${record.city}${record.zipcode ? ' ' + record.zipcode : ''}${record.stateAbbr ? ', ' + record.stateAbbr : ''}${record.country ? ', ' + record.country : ''}` : null,

                    // Sales context
                    record.lifecycle_stage ? `Stage: ${record.lifecycle_stage}` : null,
                    record.qualification_status ? `Qualification: ${record.qualification_status}` : null,

                    // Financial
                    record.revenue_range ? `Revenue: ${record.revenue_range}` : (record.revenue ? `Revenue: ${record.revenue}` : null),

                    // Description - most important for semantic understanding
                    record.description ? `Description: ${record.description}` : null,
                ];

                return companyParts.filter(Boolean).join('. ') + '.';
            }
            case 'deal':
                return `${record.name} for ${record.company_name}. Category: ${record.category}. Description: ${record.description || 'No description.'}`;
            case 'task': {
                // Enhanced task embedding with full context
                const dueDate = this.formatDateForEmbedding(record.due_date);
                const doneDate = this.formatDateForEmbedding(record.done_date);
                const createdDate = this.formatDateForEmbedding(record.created_at);
                const taskParts = [
                    // Core task information
                    `${record.type || 'Task'}: ${record.text}`,

                    // Priority and status for filtering/relevance
                    record.priority ? `Priority: ${record.priority}` : null,
                    record.status ? `Status: ${record.status}` : null,

                    // Temporal context
                    dueDate ? `Due: ${dueDate}` : null,
                    doneDate ? `Completed: ${doneDate}` : null,

                    // Assignment context
                    record.assigned_to ? `Assigned to sales rep ID ${record.assigned_to}` : null,

                    // Relationship context - critical for semantic search
                    record.contactName ? `Contact: ${record.contactName}` : null,
                    record.companyName ? `Company: ${record.companyName}` : null,
                    record.dealName ? `Deal: ${record.dealName}` : null,

                    // Additional context for better semantic understanding
                    createdDate ? `Created: ${createdDate}` : null,

                    // Archival status
                    record.archived ? 'Archived' : null,
                ];

                return taskParts.filter(Boolean).join('. ') + '.';
            }
            case 'taskNote': {
                // Task notes with hierarchical context
                const noteDate = this.formatDateForEmbedding(record.date);
                const taskNoteParts = [
                    // Core note content
                    `Task Note: ${record.text}`,

                    // Status context
                    record.status ? `Status: ${record.status}` : null,

                    // Temporal context
                    noteDate ? `Date: ${noteDate}` : null,

                    // Hierarchical context - task and contact
                    record.taskText ? `Task: ${record.taskText}` : null,
                    record.contactName ? `Contact: ${record.contactName}` : null,
                    record.companyName ? `Company: ${record.companyName}` : null,
                    record.dealName ? `Deal: ${record.dealName}` : null,
                ];

                return taskNoteParts.filter(Boolean).join('. ') + '.';
            }

            case 'note':
                // For notes, we embed the text but also include the context (contact/company name)
                return `Note: ${record.text} (Context: ${record.context_name || 'General'})`;
            default:
                return null;
        }
    }

    /**
     * Embed all tasks and task notes for a specific user/entity
     */
    static async embedAllTasks() {
        try {
            // 1. Fetch all tasks
            const { data: tasks, error: taskError } = await supabase
                .from('tasks')
                .select('id, type, text, priority, status, due_date, done_date, contact_id, company_id, deal_id, assigned_to, created_at, archived');
            
            if (taskError) {
                console.error('[EmbeddingService] Error fetching tasks for embedding:', taskError);
                return;
            }

            // 2. Fetch all task notes
            const { data: taskNotes, error: noteError } = await supabase
                .from('taskNotes')
                .select('id, task_id, text, status, date');
            
            if (noteError) {
                console.error('[EmbeddingService] Error fetching task notes for embedding:', noteError);
            }

            const tasksToProcess = tasks || [];
            const notesToProcess = taskNotes || [];

            if (tasksToProcess.length === 0 && notesToProcess.length === 0) {
                console.log('[EmbeddingService] No tasks or notes found to embed');
                return { success: 0, failed: 0 };
            }

            console.log(`[EmbeddingService] Processing ${tasksToProcess.length} tasks and ${notesToProcess.length} task notes for embedding`);
            
            let successCount = 0;
            let failCount = 0;

            // Process tasks
            for (const task of tasksToProcess) {
                const success = await this.embedRecord('task', task);
                if (success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }

            // Process task notes
            for (const note of notesToProcess) {
                const success = await this.embedRecord('taskNote', note);
                if (success) {
                    successCount++;
                } else {
                    failCount++;
                }
            }
            
            console.log(`[EmbeddingService] Completed embedding. Success: ${successCount}, Failed: ${failCount}`);
            return { success: successCount, failed: failCount };
        } catch (error) {
            console.error('[EmbeddingService] Error in embedAllTasks:', error);
            throw error;
        }
    }

    /**
     * Embed a specific task by ID
     */
    static async embedTaskById(taskId: number) {
        const { data: task, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error) {
            console.error(`[EmbeddingService] Error fetching task ${taskId} for embedding:`, error);
            return false;
        }

        if (task) {
            const success = await this.embedRecord('task', task);
            if (success) {
                console.log(`[EmbeddingService] Successfully embedded task ${taskId}`);
            }
            return success;
        }

        return false;
    }

    /**
     * Embed a task object directly
     * @throws Error if embedding fails
     */
    static async embedTask(task: any) {
        const success = await this.embedRecord('task', task);
        if (!success) {
            const errorMsg = `Failed to embed task ${task.id || 'unknown'}`;
            console.error(`[EmbeddingService] ${errorMsg}`);
            throw new Error(errorMsg);
        }
        console.log(`[EmbeddingService] Successfully embedded task ${task.id || 'unknown'}`);
    }

}
