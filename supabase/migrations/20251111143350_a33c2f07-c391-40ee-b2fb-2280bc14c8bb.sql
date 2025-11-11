-- Update RLS policies for public P2P access (no authentication required)
-- Tables: peer_connections, devices, saved_peers

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to devices" ON public.devices;
DROP POLICY IF EXISTS "Allow public insert access to devices" ON public.devices;
DROP POLICY IF EXISTS "Allow public update access to devices" ON public.devices;

DROP POLICY IF EXISTS "Allow public read access to peer_connections" ON public.peer_connections;
DROP POLICY IF EXISTS "Allow public insert access to peer_connections" ON public.peer_connections;
DROP POLICY IF EXISTS "Allow public update access to peer_connections" ON public.peer_connections;
DROP POLICY IF EXISTS "Allow public delete old peer_connections" ON public.peer_connections;

DROP POLICY IF EXISTS "Allow public read access to saved_peers" ON public.saved_peers;
DROP POLICY IF EXISTS "Allow public insert access to saved_peers" ON public.saved_peers;
DROP POLICY IF EXISTS "Allow public update access to saved_peers" ON public.saved_peers;
DROP POLICY IF EXISTS "Allow public delete access to saved_peers" ON public.saved_peers;

-- Devices table policies - allow public access for P2P
CREATE POLICY "Allow public read access to devices"
  ON public.devices
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to devices"
  ON public.devices
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to devices"
  ON public.devices
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Peer connections table policies - allow public access for P2P signaling
CREATE POLICY "Allow public read access to peer_connections"
  ON public.peer_connections
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to peer_connections"
  ON public.peer_connections
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to peer_connections"
  ON public.peer_connections
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete old peer_connections"
  ON public.peer_connections
  FOR DELETE
  USING (expires_at < now());

-- Saved peers table policies - allow public access
CREATE POLICY "Allow public read access to saved_peers"
  ON public.saved_peers
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to saved_peers"
  ON public.saved_peers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to saved_peers"
  ON public.saved_peers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to saved_peers"
  ON public.saved_peers
  FOR DELETE
  USING (true);