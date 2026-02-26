# Novelly App Architecture & Data Flow

This document outlines the architecture, data flow, and database schemas for the Novelly app. It is designed to help new collaborators quickly understand how the app fetches, caches, and enriches book metadata using a combination of fast internal caching and deep AI-driven extraction.

## 1. Tech Stack Overview
- **Frontend**: React Native (Expo)
- **Backend / Database**: Supabase (PostgreSQL)
- **AI / Data Engine**: Perplexity API (Sonar model)
- **Fallback APIs**: Google Books API, Open Library API

## 2. Core Concept: The Two-Tiered Data System
Novelly employs a two-tiered system to ensure the app loads instantly while still providing rich, encyclopedic data for individual books.

### Tier 1: The Fast Feed (`homepage_feeds`)
- **Purpose**: Provide an instant, shallow list of books (Title, Author, Cover, Rating, 5 Tropes, 5 Themes) for the Homepage and News feeds.
- **Trigger**: Opening the app or pulling to refresh.
- **Storage**: Cached locally in `AsyncStorage` and globally in Supabase's `homepage_feeds` table.
- **Lifespan**: Homepage feeds are cached for 7 days. News feeds are cached for 3.5 days.

### Tier 2: The Deep Catalog (`book_catalog` - The "Self-Growing Library")
- **Purpose**: Serve as a permanent encyclopedia of every book the app has ever discovered. Contains massive datasets (Character Archetypes, Emotional Impact, Content Warnings, Writer Style, etc.).
- **Trigger**: Runs silently in the background automatically. Whenever the `FeedService` loads 15 books for the homepage, it checks the `book_catalog` to see if those exact books exist with "Tier 2" level enrichment.
- **Execution**: If books are missing or only hold shallow data (Tier 1), the `BookService` bundles them into a multi-book batch prompt (size = 2) and sends them to Perplexity for deep extraction.
- **Storage**: Kept permanently in the Supabase `book_catalog` table.

---

## 3. Key Services (`src/services/`)

### `feed.ts`
Manages the instant UI feeds.
- Checks local `AsyncStorage` first.
- If expired, checks global `Supabase` cache.
- If expired, asks Perplexity to generate a brand new list of 15 books based on the user's selected genres.
- **Crucial Feature**: Regardless of whether it loads from cache or Perplexity, it fires off an asynchronous call to `bookService.hydrateBooksList()` to trigger background deep-enrichment.

### `bookService.ts`
The main orchestrator.
- Evaluates arrays of shallow books.
- Defers to `catalog.ts` for deep extraction batching.
- Handles fallback logic: If a book lacks a cover/rating from Perplexity, it fetches them silently from Google Books or Open Library.
- Contains `findBook(title)` which perfectly merges a shallow search result with our deep catalog record before passing it to the UI (`BookDetailScreen`).

### `catalog.ts`
Manages the `book_catalog` Supabase table.
- Uses `batchExtractAndStore` to send a list of books to Perplexity.
- Parses the complex JSON returned by Perplexity.
- Enforces strict `original.title` and `original.author` matching to ensure Perplexity's occasional hallucinations (e.g. adding a subtitle) do not result in orphaned database entries.
- Generates silent "Tier 1 Fallback" entries if Perplexity drops a book from a batch.

### `perplexity.ts`
Handles all LLM interactions.
- Contains prompts for homepage curation (`HOMEPAGE_FEED_PROMPT`).
- Contains prompts for missing rating retrieval (`fetchBatchRatings`).

---

## 4. Frontend Structure (`src/screens/`)
The frontend is built using React Native and Expo, utilizing a tab-based navigation system for the main interface, and stack navigation for deep dives (like viewing a book's details or completing an AI flow).

### Main Tab Screens (`src/screens/Main/`)
- **`Home.tsx`**: The primary landing page. It displays horizontal scrollable lists (Feeds) categorized by "New Releases", "Most Popular", and "Hidden Gems", along with a curated News stream. It uses `feedService` to fetch these feeds and handles pull-to-refresh logic. Users can select specific genres at the top to filter the feeds.
- **`Curator.tsx`**: The search and manual discovery interface. Users can search for specific books or authors. It queries the backend to pull records or triggers a new extraction if the book is unknown.
- **`Library.tsx`**: The user's personal collection. It displays the novels the user has saved, marked as "currently reading", or finished.
- **`SectionDetail.tsx`**: A vertical list view that opens when a user clicks "See All" on a horizontal feed from the Home screen, allowing for deeper scrolling.

### AI Flow Screens (`src/screens/Flows/`)
- **`Interview.tsx`**: The core dynamic recommendation flow. It acts as a conversational UI where the user answers a series of AI-generated questions (powered by Perplexity). The AI narrows down the user's exact mood and preferences to generate a highly curated cluster of book recommendations.
- **`RecResults.tsx`**: The screen displayed immediately after finishing the `Interview` flow. It presents the specific books the AI recommended based on the user's answers.
- **`RecHistory.tsx`**: A history log where users can view past `Interview` sessions they have completed and browse their prior recommendations.

### Core Detail Screens (`src/screens/`)
- **`BookDetail.tsx`**: The comprehensive encyclopedia view for a single book. Whenever a user taps on a book cover anywhere in the app, they are taken here. It consumes `bookService.findBook()` to pull the deeply merged "Tier 2" catalog data, displaying the synopsis, tropes, themes, pacing, content warnings, memorable quotes, and character archetypes.

---

## 5. Database Schemas (Supabase)

### Table: `homepage_feeds`
 Stores the pre-generated JSON arrays for instant UI loading.
```sql
CREATE TABLE homepage_feeds (
  id text PRIMARY KEY,         -- e.g. "books_Fantasy,Sci-Fi" or "news"
  content jsonb NOT NULL,      -- The array of FeedSections
  updated_at timestamptz DEFAULT now()
);
```

### Table: `book_catalog`
The self-growing encyclopedia. Uses a 4-Tier design, though currently active up to Tier 2/3.
```sql
CREATE TABLE book_catalog (
  -- Schema Keys
  catalog_key text PRIMARY KEY,   -- Format: "lowercase-title-lowercase-author"
  title text NOT NULL,
  author text NOT NULL,
  
  -- Core System Meta
  enrichment_tier smallint DEFAULT 1, -- 1: Shallow Fallback, 2: Deep Extracted, 3: Heavily Processed
  confidence_score float,
  extraction_source text,             -- e.g. 'perplexity-batch', 'hydration-only'
  needs_review boolean DEFAULT false,

  -- Metadata
  cover_image text,
  rating float,
  ratings_count int,
  rating_source text,
  page_count int,

  -- Tier 1 Content
  primary_genre text,
  description text,
  themes text[],
  pacing text,
  tone text[],
  mood_emotions text[],
  
  -- Tier 2 Content
  subgenres text[],
  tropes text[],
  characterization text,
  writing_style text[],
  character_archetypes text[],
  content_warnings jsonb, 
  emotional_impact text,
  setting text,
  target_age_group text,
  perfect_for text,
  memorable_quote text,
  
  -- Embeddings
  embedding_text text,
  embedding vector(1536)
);
```

---

## 6. Current Known Issues / WIP
We are currently actively debugging the **Silent Catalog Extraction Bypass**.

**The Symptom:**
Random books found in the `homepage_feeds` memory cache are successfully passing through the `feed.ts` background hydration trigger but are **failing** to trigger a deep Tier 2 extraction in `catalog.ts`. When viewed in the UI, these books are missing `perfect_for` and `character_archetypes`, indicating they somehow bypassed the Perplexity catalog generation step entirely.

**Current Investigation Points:**
- Confirming that `evaluate` loops in `catalog.ts` are correctly flagging cached `enrichment_tier < 2` records for re-extraction.
- Verifying whether `BATCH_SIZE = 2` chunking arrays inside `hydrateBooksList` are prematurely aborting before looping.
- Auditing terminal logs using `npm run android` to find the exact point of execution drop-off when `hydrateBooksList` receives an array of 15 previously-cached books.

<br>
<br>

---

# Mac to Android Setup Guide

This guide is for developers using a **Mac** who want to build and run the Novelly app natively on a physical **Android phone** (or Android Emulator). 

Since Novelly uses custom native code (via `expo run:android`), you **cannot** just use the Expo Go app. You must compile the app directly onto your device.

---

## Step 1: Install Mac Prerequisites
You will need Node.js and Watchman installed on your Mac. The easiest way to do this is using [Homebrew](https://brew.sh/).

1. Open your Mac **Terminal**.
2. Run the following commands:
   ```bash
   brew install node
   brew install watchman
   ```
3. Verify Node is installed:
   ```bash
   node -v
   ```

## Step 2: Install Android Studio
To compile Android apps on a Mac, you need the Android SDK.

1. Download and install [Android Studio for Mac](https://developer.android.com/studio).
2. Open Android Studio, and follow the setup wizard to install the standard **Android SDK**, **Android SDK Command-line Tools**, and **Android SDK Build-Tools**.
3. **Configure your Mac's Environment Variables**:
   Open your terminal profile (`~/.zshrc` or `~/.bash_profile`) and add the following lines to the bottom:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. Run `source ~/.zshrc` (or restart your terminal) to apply the changes.

---

## Step 3: Prepare Your Android Phone
You need to enable your phone to accept development apps via USB.

1. On your Android phone, go to **Settings > About Phone**.
2. Tap on **"Build Number"** 7 times until you see a message saying "You are now a developer!".
3. Go back to the main Settings menu and find **Developer Options** (usually under System).
4. Turn on **USB Debugging**.
5. Connect your phone to your Mac using a USB cable. 
6. *Important:* A prompt will appear on your phone asking "Allow USB Debugging from this computer?". Check "Always allow" and tap **OK**.

### Verify the Connection
In your Mac terminal, type:
```bash
adb devices
```
You should see your device listed (e.g., `RF8N123456 device`). If it says `unauthorized`, you missed the prompt on your phone screen!

---

## Step 4: Set Up the Project
1. Open your terminal and navigate to where you want the project folder, then clone the repository:
   ```bash
   git clone <repository_url>
   cd Novelly
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the Environment Variables:
   - Create a file named `.env` in the root of the `Novelly` folder.
   - Ask your team for the required API Keys and add them to the file:
     ```env
     PERPLEXITY_API_KEY=your_key_here
     PERPLEXITY_MODEL=sonar
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_key
     ```

---

## Step 5: Run the App on Your Phone!
Ensure your phone is plugged in and unlocked.

Run the following command in your terminal from the root `Novelly` folder:
```bash
npm run android
```

### What happens next?
1. The Metro Bundler (the local development server) will start in your terminal.
2. Expo will invoke Gradle to compile the raw Java/Kotlin code into an `.apk`. This can take **5-10 minutes** the very first time you do it!
3. Once compiled, it will push the app to your Android phone via USB and automatically launch it.

### Troubleshooting
- **Build failed?** Make sure you do not have another Metro bundler running in the background. You can clear the cache and force a fresh build using: `npm run android -- --reset-cache`
- **Phone disconnected?** If you accidentally unplug the USB cable, the Metro terminal might lose its connection. Replug the phone, go to the Metro terminal, and press `a` (to open Android) or `r` (to reload) to re-establish the bridge.
