-- Pro-Culto v2: expandir tipos de itens de liturgia
ALTER TABLE public.culto_liturgia_itens
  DROP CONSTRAINT IF EXISTS culto_liturgia_itens_tipo_check;

ALTER TABLE public.culto_liturgia_itens
  ADD CONSTRAINT culto_liturgia_itens_tipo_check
  CHECK (tipo IN (
    'preludio','inicio','leitura','oracao','louvor','musica','hino','coral',
    'intercessao','oferta','pregacao','encerramento','informativo','posludio',
    'item','anuncio','ceia','batismo','outro'
  ));
