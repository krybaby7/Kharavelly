import { Book, BookStatus } from '../types';
import { supabase } from './supabase';

export class LibraryService {
    private isLoaded: boolean = false;

    async loadLibrary(): Promise<Record<string, Book>> {
        const { data, error } = await supabase
            .from('books')
            .select('*');

        if (error) {
            console.error("Failed to load library from Supabase", error);
            return {};
        }

        const library: Record<string, Book> = {};
        data?.forEach((book: any) => {
            const key = `${book.title.toLowerCase()}|${book.author.toLowerCase()}`;
            library[key] = {
                ...book,
                // Ensure helper types match
                relationship_dynamics: book.relationship_dynamics || {},
                tropes: book.tropes || [],
                themes: book.themes || [],
                microthemes: book.microthemes || []
            };
        });

        this.isLoaded = true;
        return library;
    }

    async addBook(book: Book): Promise<void> {
        const { error } = await supabase
            .from('books')
            .upsert({
                title: book.title,
                author: book.author,
                status: book.status,
                cover_image: book.coverImage,
                description: book.description,
                tropes: book.tropes,
                themes: book.themes,
                microthemes: book.microthemes,
                relationship_dynamics: book.relationship_dynamics,
                progress: book.progress,
                total_pages: book.total_pages
                // Let Supabase handle user_id via default auth.uid()
            }, {
                onConflict: 'user_id, title, author'
            });

        if (error) console.error("Failed to add book", error);
    }

    async updateStatus(title: string, author: string, status: BookStatus): Promise<boolean> {
        const { error } = await supabase
            .from('books')
            .update({ status })
            .eq('title', title)
            .eq('author', author);

        if (error) {
            console.error("Failed to update status", error);
            return false;
        }
        return true;
    }

    async updateProgress(title: string, author: string, progress: number): Promise<boolean> {
        const { error } = await supabase
            .from('books')
            .update({ progress })
            .eq('title', title)
            .eq('author', author);

        if (error) {
            console.error("Failed to update progress", error);
            return false;
        }
        return true;
    }

    async deleteBook(title: string, author: string): Promise<boolean> {
        const { error } = await supabase
            .from('books')
            .delete()
            .eq('title', title)
            .eq('author', author);

        if (error) {
            console.error("Failed to delete book", error);
            return false;
        }
        return true;
    }

    // Helper to get local snapshot if needed, but better to query DB or use state management
    // For now, simple direct query for these getters might be slow. 
    // Optimization: Cache results or use a reactive store (Context/Redux).
    // Keeping simple for migration.
}

export const libraryService = new LibraryService();
