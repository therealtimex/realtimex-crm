import { supabase } from '../../components/atomic-crm/providers/supabase/supabase';
import axios from 'axios';

/**
 * EmbeddingService
 * 
 * Logic to flatten CRM entities into semantic strings and 
 * compute/store embeddings for semantic search.
 */
export class EmbeddingService {
    /**
     * Embed a CRM record
     */
    static async embedRecord(type: 'contact' | 'company' | 'deal' | 'task' | 'note', record: any) {
        const content = this.flattenRecord(type, record);
        if (!content) return;

        try {
            // 1. Get embedding from SDK (via backend proxy)
            const response = await axios.post('/api/sdk/embed', { content });

            if (!response.data.success) {
                throw new Error(response.data.message || 'Embedding failed');
            }

            const { embedding, model } = response.data;

            // 2. Upsert into entity_vectors
            await supabase.from('entity_vectors').upsert({
                entity_type: type,
                entity_id: record.id,
                content: content,
                embedding: embedding,
                model: model,
                updated_at: new Date().toISOString()
            }, { onConflict: 'entity_type,entity_id' });

            console.log(`[EmbeddingService] Embedded ${type}: ${record.id}`);
        } catch (error) {
            console.error(`[EmbeddingService] Failed to embed ${type}:`, error);
        }
    }

    /**
     * Flatten a record into a searchable string
     */
    private static flattenRecord(type: string, record: any): string | null {
        switch (type) {
            case 'contact':
                return `${record.first_name} ${record.last_name}${record.title ? ` (${record.title})` : ''} at ${record.company_name || 'Individual'}. Tags: ${(record.tags || []).join(', ')}.`;
            case 'company':
                return `${record.name} (${record.sector || 'General'}). Description: ${record.description || 'No description available.'}`;
            case 'deal':
                return `${record.name} for ${record.company_name}. Category: ${record.category}. Description: ${record.description || 'No description.'}`;
            case 'task':
                return `${record.type} Task: ${record.text}. Priority: ${record.priority}. Status: ${record.status}.`;
            case 'note':
                // For notes, we embed the text but also include the context (contact/company name)
                return `Note: ${record.text} (Context: ${record.context_name || 'General'})`;
            default:
                return null;
        }
    }
}
