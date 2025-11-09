-- Create devices table to store device information
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create saved_peers table to store peer connections
CREATE TABLE public.saved_peers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  peer_device_id TEXT NOT NULL,
  peer_name TEXT NOT NULL,
  last_connected TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(device_id, peer_device_id)
);

-- Enable Row Level Security
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_peers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devices (public read/write for now, will secure after auth)
CREATE POLICY "Anyone can view devices" ON public.devices FOR SELECT USING (true);
CREATE POLICY "Anyone can insert devices" ON public.devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update devices" ON public.devices FOR UPDATE USING (true);

-- RLS Policies for saved_peers (public read/write for now, will secure after auth)
CREATE POLICY "Anyone can view saved peers" ON public.saved_peers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert saved peers" ON public.saved_peers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update saved peers" ON public.saved_peers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete saved peers" ON public.saved_peers FOR DELETE USING (true);

-- Create index for faster lookups
CREATE INDEX idx_devices_device_id ON public.devices(device_id);
CREATE INDEX idx_saved_peers_device_id ON public.saved_peers(device_id);
CREATE INDEX idx_saved_peers_peer_device_id ON public.saved_peers(peer_device_id);