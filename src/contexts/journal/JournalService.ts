
import { supabase } from '@/integrations/supabase/client';
import { JournalEntry } from '@/types';
import { encryptJournalEntry, decryptJournalEntry } from '@/utils/encryption';
import { transformDatabaseEntryToJournalEntry, transformEntryForDatabase } from './journalHelpers';

export class JournalService {
  static async fetchEntries(userId: string): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp_started', { ascending: false });

    if (error) throw error;

    // Transform and decrypt the data
    const transformedEntries: JournalEntry[] = [];
    
    for (const entry of data) {
      // Transform the database entry to our app's JournalEntry type
      const journalEntry = transformDatabaseEntryToJournalEntry(entry);
      
      // Decrypt the content
      const decryptedEntry = await decryptJournalEntry(journalEntry, userId);
      transformedEntries.push(decryptedEntry);
    }

    console.log("Loaded entries with tracks:", transformedEntries.filter(e => e.track).length);
    return transformedEntries;
  }

  static async addEntry(entry: JournalEntry, userId: string): Promise<JournalEntry> {
    // Encrypt the entry content before saving to database
    const encryptedEntry = await encryptJournalEntry(entry, userId);
    const dataToInsert = {
      ...transformEntryForDatabase(encryptedEntry),
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) throw error;

    // Return the decrypted entry with the server-generated ID
    const newEntry: JournalEntry = {
      ...entry, // Use the original unencrypted entry
      id: data.id,
      createdAt: new Date(data.created_at).getTime(),
    };

    return newEntry;
  }

  static async updateEntry(entry: JournalEntry, userId: string): Promise<void> {
    // Add the current timestamp as updated_at
    const now = new Date();
    
    // Encrypt content before saving to database
    const encryptedEntry = await encryptJournalEntry(entry, userId);
    
    const dataToUpdate = {
      ...transformEntryForDatabase(encryptedEntry),
      updated_at: now.toISOString() // Add the updated_at timestamp
    };
    
    const { error } = await supabase
      .from('journal_entries')
      .update(dataToUpdate)
      .eq('id', entry.id);

    if (error) throw error;
  }

  static async deleteEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async addCommentToEntry(entry: JournalEntry, content: string, userId: string): Promise<void> {
    // Create a new comment object
    const now = new Date();
    const newComment = {
      id: `comment-${Date.now()}`,
      content,
      createdAt: now.getTime()
    };

    // Add the comment to the entry
    const updatedEntry: JournalEntry = {
      ...entry,
      comments: [...(entry.comments || []), newComment]
    };

    // Encrypt the updated entry before saving
    const encryptedEntry = await encryptJournalEntry(updatedEntry, userId);
    
    // Update the entry in the database
    const { error } = await supabase
      .from('journal_entries')
      .update({
        entry_text: encryptedEntry.content,
        updated_at: now.toISOString()
      })
      .eq('id', entry.id);

    if (error) throw error;
  }

  static async deleteCommentFromEntry(entry: JournalEntry, commentId: string, userId: string): Promise<void> {
    // Filter out the comment to delete
    const updatedComments = (entry.comments || []).filter(
      comment => comment.id !== commentId
    );

    // Update the entry with the filtered comments
    const updatedEntry: JournalEntry = {
      ...entry,
      comments: updatedComments
    };

    // Encrypt the updated entry before saving
    const encryptedEntry = await encryptJournalEntry(updatedEntry, userId);
    
    // Update the entry in the database
    const now = new Date();
    const { error } = await supabase
      .from('journal_entries')
      .update({
        entry_text: encryptedEntry.content,
        updated_at: now.toISOString()
      })
      .eq('id', entry.id);

    if (error) throw error;
  }
}
