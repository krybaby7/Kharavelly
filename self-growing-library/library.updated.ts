// ============================================================
// Library Service — Updated with Catalog Integration
// ============================================================
// When a user adds a book to their library, we:
//   1. Save it to the user's personal `books` table (as before)
//   2. Ensure it exists in the shared `book_catalog`
//   3. Increment the "times_saved" counter in the catalog
//   4. Queue it for background enrichment if needed
// ============================================================

import { Book, BookStatus } from '../types';
import { supabase } from './supabase';
import { catalogService } from './catalog';
import { makeCatalogKey } from '../types/catalog';

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
                coverImage: book.cover_image || book.coverImage,
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
        // 1. Save to user's personal library (as before)
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
            }, {
                onConflict: 'user_id, title, author'
            });

        if (error) {
            console.error("Failed to add book", error);
            return;
        }

        // 2. Ensure it's in the catalog (non-blocking)
        catalogService.ensureInCatalog(
            book.title,
            book.author,
            {
                cover_image: book.coverImage || null,
                description: book.description || '',
                themes: book.themes || [],
                tropes: book.tropes || [],
                rating: book.rating as any,
                ratings_count: book.ratings_count,
                rating_source: book.rating_source,
                page_count: book.total_pages,
            }
        ).then(() => {
            // 3. Increment saved counter
            const key = makeCatalogKey(book.title, book.author);
            catalogService.incrementSaved(key);
        }).catch(e => {
            console.error("[Library] Catalog sync failed (non-critical):", e);
        });
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
}

export const libraryService = new LibraryService();
