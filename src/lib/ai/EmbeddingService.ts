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

    private static buildFullName(firstName?: string | null, lastName?: string | null): string | null {
        const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
        return fullName || null;
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

            return `${contact.first_name} ${contact.last_name}`;
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
     */
    static async embedRecord(type: 'contact' | 'company' | 'deal' | 'task' | 'taskNote' | 'note', record: any) {
        // Allow disabling embeddings via environment variable
        if (import.meta.env.VITE_DISABLE_EMBEDDINGS === 'true') {
            console.log('[EmbeddingService] Embeddings disabled via VITE_DISABLE_EMBEDDINGS');
            return;
        }

        // Ensure record has an ID before embedding
        if (!record.id) {
            console.warn(`[EmbeddingService] Skipping embedding for ${type} - missing ID`, record);
            return;
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
            const inlineContactName =
                enrichedRecord.contactName ||
                this.buildFullName(enrichedRecord.contact_first_name, enrichedRecord.contact_last_name);
            const inlineCompanyName = enrichedRecord.companyName || enrichedRecord.company_name || null;
            const inlineDealName = enrichedRecord.dealName || enrichedRecord.deal_name || null;

            let contactName = inlineContactName || null;
            let companyName = inlineCompanyName;
            let dealName = inlineDealName;

            if (!contactName && !companyName && !dealName) {
                const taskContext = await this.fetchTaskContext(record.id);
                if (taskContext) {
                    contactName = taskContext.contactName;
                    companyName = taskContext.companyName;
                    dealName = taskContext.dealName;
                }
            }

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
        if (!content) return;

        try {
            // Log what we're actually embedding to verify completeness
            console.log(`[EmbeddingService] Content to embed (${type} ${record.id}):`, content);

            // 1. Fetch user's AI settings (embedding provider/model)
            const settings = await this.fetchAISettings();

            // 2. Get embedding from SDK (via backend proxy)
            // Embedding can take 10-30s depending on provider, so use longer timeout
            const response = await axios.post('/api/sdk/embed', {
                content,
                settings  // Pass user's embedding settings
            }, {
                timeout: 35000  // 35 second timeout (longer than backend's 30s)
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
            const { data, error: upsertError } = await supabase.from('entity_vectors').upsert({
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
        } catch (error: any) {
            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                console.warn(`[EmbeddingService] ⚠️ Embedding timeout for ${type} - embedding provider not configured or RealTimeX Desktop not running`);
            } else {
                console.error(`[EmbeddingService] ❌ Failed to embed ${type}:`, error.message || error);
            }
        }
    }

    /**
     * Flatten a record into a searchable string
     */
    private static flattenRecord(type: string, record: any): string | null {
        switch (type) {
            case 'contact':
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
            case 'company':
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
            case 'deal':
                return `${record.name} for ${record.company_name}. Category: ${record.category}. Description: ${record.description || 'No description.'}`;
            case 'task':
                // Enhanced task embedding with full context
                const taskParts = [
                    // Core task information
                    `${record.type || 'Task'}: ${record.text}`,

                    // Priority and status for filtering/relevance
                    record.priority ? `Priority: ${record.priority}` : null,
                    record.status ? `Status: ${record.status}` : null,

                    // Temporal context
                    record.due_date ? `Due: ${new Date(record.due_date).toLocaleDateString()}` : null,
                    record.done_date ? `Completed: ${new Date(record.done_date).toLocaleDateString()}` : null,

                    // Assignment context
                    record.assigned_to ? `Assigned to sales rep ID ${record.assigned_to}` : null,

                    // Relationship context - critical for semantic search
                    record.contactName ? `Contact: ${record.contactName}` : null,
                    record.companyName ? `Company: ${record.companyName}` : null,
                    record.dealName ? `Deal: ${record.dealName}` : null,

                    // Archival status
                    record.archived ? 'Archived' : null,
                ];

                return taskParts.filter(Boolean).join('. ') + '.';

            case 'taskNote':
                // Task notes with hierarchical context
                const taskNoteParts = [
                    // Core note content
                    `Task Note: ${record.text}`,

                    // Status context
                    record.status ? `Status: ${record.status}` : null,

                    // Temporal context
                    record.date ? `Date: ${new Date(record.date).toLocaleDateString()}` : null,

                    // Hierarchical context - task and contact
                    record.taskText ? `Task: ${record.taskText}` : null,
                    record.contactName ? `Contact: ${record.contactName}` : null,
                    record.companyName ? `Company: ${record.companyName}` : null,
                    record.dealName ? `Deal: ${record.dealName}` : null,
                ];

                return taskNoteParts.filter(Boolean).join('. ') + '.';

            case 'note':
                // For notes, we embed the text but also include the context (contact/company name)
                return `Note: ${record.text} (Context: ${record.context_name || 'General'})`;
            default:
                return null;
        }
    }
}
