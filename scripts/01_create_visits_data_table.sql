-- Create visits_data table for storing collected data
-- This table stores all visitor data collected from the landing page

CREATE TABLE IF NOT EXISTS public.visits_data (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Identificação
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    session_id UUID NOT NULL,
    referrer TEXT,
    current_url TEXT,
    collected_at TIMESTAMP WITH TIME ZONE,
    
    -- Navegador/Hardware
    user_agent TEXT,
    language TEXT,
    platform TEXT,
    cookie_enabled BOOLEAN,
    do_not_track TEXT,
    hardware_concurrency INTEGER,
    device_memory INTEGER,
    
    -- Tela/Viewport
    screen_width INTEGER,
    screen_height INTEGER,
    screen_color_depth INTEGER,
    screen_pixel_depth INTEGER,
    window_inner_width INTEGER,
    window_inner_height INTEGER,
    device_pixel_ratio NUMERIC,
    
    -- Geolocalização
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    accuracy NUMERIC,
    city TEXT,
    region TEXT,
    country TEXT,
    geo_source TEXT,
    geo_status TEXT,
    
    -- Performance Timing (ms)
    navigation_start BIGINT,
    unload_event_start BIGINT,
    unload_event_end BIGINT,
    redirect_start BIGINT,
    redirect_end BIGINT,
    fetch_start BIGINT,
    domain_lookup_start BIGINT,
    domain_lookup_end BIGINT,
    connect_start BIGINT,
    connect_end BIGINT,
    request_start BIGINT,
    response_start BIGINT,
    response_end BIGINT,
    dom_loading BIGINT,
    dom_interactive BIGINT,
    dom_content_loaded_event_start BIGINT,
    dom_content_loaded_event_end BIGINT,
    load_event_start BIGINT,
    load_event_end BIGINT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_visits_data_session_id ON public.visits_data(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_data_timestamp ON public.visits_data(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_visits_data_country ON public.visits_data(country);
CREATE INDEX IF NOT EXISTS idx_visits_data_city ON public.visits_data(city);

-- Enable Row Level Security
ALTER TABLE public.visits_data ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous inserts (for data collection)
CREATE POLICY "Allow anonymous inserts on visits_data" 
    ON public.visits_data 
    FOR INSERT 
    WITH CHECK (true);

-- Create policy to allow reads only for authenticated users (for admin dashboard)
CREATE POLICY "Allow authenticated users to read visits_data" 
    ON public.visits_data 
    FOR SELECT 
    USING (auth.role() = 'authenticated');
