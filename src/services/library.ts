import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, BookStatus } from '../types';

const STORAGE_KEY = 'novelly_library_v1';

export class LibraryService {
    private library: Record<string, Book> = {};
    private isLoaded: boolean = false;

    private getKey(title: string, author: string): string {
        return \`\${title.toLowerCase()}|\${author.toLowerCase()}\`;
    }

    async loadLibrary(): Promise<Record<string, Book>> {
        if (this.isLoaded) return this.library;

        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (data) {
                this.library = JSON.parse(data);
            }
        } catch (e) {
            console.error("Failed to load library", e);
        }
        this.isLoaded = true;
        return this.library;
    }

    async saveLibrary(): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.library));
        } catch (e) {
            console.error("Failed to save library", e);
        }
    }

    async addBook(book: Book): Promise<void> {
        await this.loadLibrary();
        const key = this.getKey(book.title, book.author);
        
        // If exists, update but preserve some fields if needed.
        // For now, overwrite but ensure added_date
        const existing = this.library[key];
        
        this.library[key] = {
            ...book,
            added_date: existing ? existing.added_date : new Date().toISOString()
        };
        await this.saveLibrary();
    }

    async updateStatus(title: string, author: string, status: BookStatus): Promise<boolean> {
        await this.loadLibrary();
        const key = this.getKey(title, author);
        if (this.library[key]) {
            this.library[key].status = status;
            await this.saveLibrary();
            return true;
        }
        return false;
    }

    async deleteBook(title: string, author: string): Promise<boolean> {
        await this.loadLibrary();
        const key = this.getKey(title, author);
        if (this.library[key]) {
            delete this.library[key];
            await this.saveLibrary();
            return true;
        }
        return false;
    }

    getBooksByStatus(status: BookStatus): Book[] {
        return Object.values(this.library).filter(b => b.status === status);
    }

    getAllBooks(): Book[] {
        return Object.values(this.library);
    }
    
    getExcludedBooks(): string[] {
        // Return titles of books in Read or TBR
        return Object.values(this.library)
            .filter(b => b.status === 'read' || b.status === 'tbr')
            .map(b => b.title);
    }
}

export const libraryService = new LibraryService();
