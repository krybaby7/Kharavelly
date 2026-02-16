-- ============================================================
-- MIGRATION: Add helper RPC function for atomic counter increments
-- Run this in your Supabase SQL Editor after 001_book_catalog.sql
-- ============================================================

CREATE OR REPLACE FUNCTION increment_catalog_counter(
    p_catalog_key TEXT,
    p_field TEXT
)
RETURNS VOID AS $$
BEGIN
    IF p_field = 'times_recommended' THEN
        UPDATE book_catalog 
        SET times_recommended = COALESCE(times_recommended, 0) + 1
        WHERE catalog_key = p_catalog_key;
    ELSIF p_field = 'times_saved' THEN
        UPDATE book_catalog 
        SET times_saved = COALESCE(times_saved, 0) + 1
        WHERE catalog_key = p_catalog_key;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
