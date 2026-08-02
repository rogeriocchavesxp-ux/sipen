-- Adiciona coluna de imagem às campanhas e cria bucket de storage público

ALTER TABLE public.ofertas_especiais
  ADD COLUMN IF NOT EXISTS imagem_url text;

-- Bucket público para artes das campanhas
INSERT INTO storage.buckets (id, name, public)
VALUES ('campanhas', 'campanhas', true)
ON CONFLICT (id) DO NOTHING;

-- Autenticados podem fazer upload, update e delete
DROP POLICY IF EXISTS "authenticated_upload_campanhas" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_update_campanhas" ON storage.objects;
CREATE POLICY "authenticated_upload_campanhas"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'campanhas')
  WITH CHECK (bucket_id = 'campanhas');

-- Leitura pública (necessária para campanha.html mostrar a imagem)
DROP POLICY IF EXISTS "public_read_campanhas" ON storage.objects;
CREATE POLICY "public_read_campanhas"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'campanhas');
