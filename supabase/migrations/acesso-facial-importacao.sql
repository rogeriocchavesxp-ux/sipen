-- ══════════════════════════════════════════════════════════════════════════════
-- SIPEN — Importação lista de Acesso Facial (PDF)
-- Executar em 2 fases no Supabase Dashboard > SQL Editor
--
-- FASE 1: Rodar apenas o bloco "SIMULAÇÃO" para revisar os matches.
-- FASE 2: Após revisar, descomentar e rodar o bloco "INSERÇÃO".
-- ══════════════════════════════════════════════════════════════════════════════

-- Pré-requisito: extensão pg_trgm (geralmente já ativa no Supabase)
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 1 — SIMULAÇÃO: correspondência nome PDF × cadastro pessoas
-- ─────────────────────────────────────────────────────────────────────────────

WITH nomes_pdf AS (
  -- Lista completa extraída do PDF (deduplicada por normalização)
  SELECT DISTINCT
    trim(nome_bruto) AS nome_bruto,
    lower(
      regexp_replace(
        translate(trim(nome_bruto),
          'àáâãäåèéêëìíîïòóôõöùúûüýÿçñÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑ',
          'aaaaaaeeeeiiiioooooouuuuyyçnAAAAAAEEEEIIIIOOOOOOUUUUYYCN'
        ),
        '[^a-z0-9 ]', ' ', 'g'
      )
    ) AS nome_norm
  FROM (VALUES
    ('Rogerio de Castro Chaves'),
    ('Laércio Ferreira Lima'),
    ('Carlos Eduardo corrêa de lima'),
    ('Jean Carlos da silva'),
    ('Persilio Deior'),
    ('Euclides Portella da rocha'),
    ('Eni Beloti'),
    ('Daniel simões de carvalho'),
    ('Alberto Sinhiti noguti'),
    ('Marcus Vinicius Barros de Novais'),
    ('Gustavo Diaz'),
    ('Pablo Nunes santos'),
    ('Ely da Conceição Coelho'),
    ('Jéssica Coelho'),
    ('Gabriel Dias Marinho'),
    ('Kevin Verdugues miranda'),
    ('Neiva afonso lima gomes'),
    ('Sidney Ferreira Lima'),
    ('Hugo alcantara miguel'),
    ('Carlos alberto de Paula santos'),
    ('Yarian Santana'),
    ('Amanda Aparecida Ferreira Crevelanti'),
    ('Caroline de Oliveira Cunha'),
    ('Victor Maso'),
    ('Surama Cecília de Castro Ribeiro Lima'),
    ('Daniel Felipe de Souza'),
    ('Ronaldo gomes da silva'),
    ('Flavio Gallani'),
    ('Marcio Damásio'),
    ('Edson Luís Vieira'),
    ('Paulo Andrés Erben Castro'),
    ('Arthur Alves de Moraes Miguel'),
    ('Carlos Alberto Henrique'),
    ('Giulia Fuga Dal maso'),
    ('Nathalia Maso'),
    ('Danilo Lino do Santos'),
    ('Maressa Carolina Alonso'),
    ('Ismael Molina'),
    ('Poliana Rocha'),
    ('Renata Rocha'),
    ('Cácio Evagelista da Silva'),
    ('Sérgio Paulo crecchi'),
    ('Guilherme de Oliveira Cunha'),
    ('Giovanna Couto Serafim'),
    ('Jollyana Shiroma'),
    ('Liliane Alves de Morais Miguel'),
    ('Karina Cavalieri de Novais'),
    ('Raquel Cavalieri Lee'),
    ('George Gomes Cunha'),
    ('Caíque Souza trindade'),
    ('Lucas Henrique Tonkiel'),
    ('Jackson Gean Guedes'),
    ('Jairo Isac Rodrigues'),
    ('Angelica Santana Rodrigues'),
    ('Michele Freitas Lima'),
    ('Edileuza Lino do Santos'),
    ('Marcia Aparecida loreno molina'),
    ('Gabriel assis brogim'),
    ('Isabelle Soranso Nappi Assis'),
    ('Yuri Diego molina'),
    ('Daniel Perreira Aguiar'),
    ('Matheus de Amorim Alves de Melo'),
    ('Erika Lino de Melo'),
    ('Agilson Alves de Oliveira'),
    ('Alexandre Carraleiro Martins'),
    ('Adriano portella da Rocha'),
    ('Fladimir Pessoa Martins'),
    ('Osias Vasconcelos Junior'),
    ('Edclei Alves Brito'),
    ('Hernan Sorio'),
    ('Valdir Patriani'),
    ('Fábio Luiz de Carvalho'),
    ('Sofia Souza Ramos de Oliveira'),
    ('Gustavo Stroppa Mesquita'),
    ('Luis Roberto dos santos'),
    ('Ricardo Riul'),
    ('Tayna Faria'),
    ('João Marcos Moreira da Silva'),
    ('Lucas Soranso D Nappe'),
    ('Jhonatan Diego Santos Barreto'),
    ('Augusto Turim'),
    ('Luiz Felipe de Almeida'),
    ('Flavio Barreto Medeiros'),
    ('Aline Cristina Elidgio'),
    ('Cicero Martins da Silva'),
    ('Thiago Caputo Cavalieri'),
    ('Edson Menezes de Carvalho Júnior'),
    ('Renata Rocha Vargas Henrique'),
    ('Tiago Rocha Vargas Henrique'),
    ('Áurea Daré Vasconcelos'),
    ('Max Filipe'),
    ('Poliana Rocha Vargas Henrique'),
    ('Jennifer da Silva Langervisch'),
    ('Crispin Ariel Choquetarqui'),
    ('Jéssica Wingerter Teixeira Coelho'),
    ('Maritza Benitta Surco Monrroy'),
    ('Eder Góis de Oliveira'),
    ('Camila Torres Cesar'),
    ('Deborah Alves de Moraes Miguel'),
    ('Deise Maria Augusto'),
    ('Dagmar Daré'),
    ('Hozea Barbosa Stroppa'),
    ('Guilherme Mastro Pietro'),
    ('Enrico Cavalieri Lee'),
    ('Rebeca Jacob Abdalla Pietro'),
    ('Marcia Caputo Cavalieri'),
    ('Elisangela Gomes Oliveira da Silva'),
    ('Selma Moreira Salles Lima'),
    ('Erlana Enriete Soares Auretil'),
    ('Raquel Carvalho'),
    ('Elisa Martins'),
    ('Isabely Yamani de Oliveira'),
    ('Osvaldo Gabriel'),
    ('Keila Yamani Eugenio'),
    ('Ivani do carmo oliveira da silva'),
    ('Jair Alves pereira'),
    ('Daniele Pires de Souza Wood'),
    ('Rosangela Barreto de Lima'),
    ('Neuza Morais de castilho'),
    ('Marli Marques de Oliveira'),
    ('Ozea Barbora Stroopa'),
    ('Patricia Regina Alonso'),
    ('Aparecida França de Macedo'),
    ('Fabio Thiago Alonso'),
    ('Maria Izabel Proença'),
    ('Josefa Alves da Silva'),
    ('Elisabete Araujo Pacifico da Silva'),
    ('Eleaqum da Silva Trindade'),
    ('Glaucia Helena de Souza Pinto'),
    ('Auzerina Vilela de Paula'),
    ('Andrea Bento da Silva'),
    ('Catia Correa de Souza Araujo'),
    ('Felipe Passos Santos Gomes de Araujo'),
    ('Luciana Duarte Srecchi'),
    ('Percilia Coutinho Pereira Agliace'),
    ('Solange Deanna de Matos'),
    ('Vera Lucia Agaphio Combertino'),
    ('Alessandra Bizeli Oliveira Sartori'),
    ('Paula Cristina Rezende'),
    ('Geni do Nascimento Porto Simoes'),
    ('Auria Dare Vasconcelos'),
    ('Sarah Strachicini Carvalho'),
    ('Aline Pereira Cardoso Tavares'),
    ('Armando Pagliaci Junior'),
    ('Maricia Tereza Gallani'),
    ('Angelina Vieira Guimaraes'),
    ('Edna Francisco Ferraz'),
    ('Gilberto Gallani Silva'),
    ('Silmara Cardoso da Silva'),
    ('Roberto Salvattore Porto Simoes'),
    ('Ana Claudia Trancolin Gallo'),
    ('Helena de Jesus Araujo'),
    ('Ana Catarina Almeida Franco'),
    ('Simone Soranso Nappi'),
    ('Mariza Alessandra Monsalles Aquetti'),
    ('Wesley Silva Franco'),
    ('Marcia Diniz Soares Barbosa'),
    ('Madalena Martins da Silva'),
    ('Cristina Gutierrez Fernandes'),
    ('Maria Bezerra da Silva Sales'),
    ('Edgar Barbosa de Oliveira'),
    ('Katia Valerio de Almeida'),
    ('Alexandre Henrique Aquotti'),
    ('Tiago de Oliveira Evangelista'),
    ('Maria Aparecida Mieto Rocha'),
    ('Lucia Saleste Costa Viera'),
    ('Vitor Santos Góis de Oliveira'),
    ('Maria do Carmo Alves'),
    ('Antônio Festas Miguel'),
    ('Mariana Ferreira Lima'),
    ('Matheus Wood'),
    ('Gabrielle Ferreira Lima'),
    ('Ruthy da Rocha Miguel'),
    ('Liza de souza Dias'),
    ('Ronaldo Ramos da Silva'),
    ('Eliviado Viera'),
    ('Tiago Rocha Vargas Enrico'),
    ('Silvana Aparecida sales Martins'),
    ('Vinicius Tridico Hspanha Urban'),
    ('Ivani de Lourdes Sales Luiz'),
    ('Zenaide Aparecida Pereira'),
    ('Daniela Aparecida de França Santo'),
    ('Brenda Vilela Machado'),
    ('Ana Beatriz de Castro França'),
    ('Cecília do Santos Santana'),
    ('Jesse Jorge Oliveira Santana'),
    ('Fábio Perreira'),
    ('Débora Ferreira'),
    ('Paulo Francisco da Silva'),
    ('Onilda Batista Rocha'),
    ('Max Filipe Silva Gonçalves'),
    ('Rebeca Cavalheire de Novais'),
    ('Manuela Cavalheire de Novais'),
    ('Marlene de Fátima dos santos'),
    ('Herminio Estevão ramos Rodrigues'),
    ('Jessyca da Silva Rodrigues'),
    ('Vanilda carrasco Santa Cecilia'),
    ('Janaina Oliveira Simões de Carvalho'),
    ('Liziene da Silva Oliveira'),
    ('Felipe Marcelo de Oliveira Caffeu'),
    ('Simone Segna pinheiro Braga'),
    ('Nelson Alves Braga filho'),
    ('Lucila Isabel Berduquerz Rodríguez'),
    ('Taise Viera Shingai Pinheiro'),
    ('Jonathan Shingai Pinheiro'),
    ('Matheus Jorge Santana'),
    ('José Viera Araújo'),
    ('Ana Paula Gonçales Guariento'),
    ('Hillany Lourrane'),
    ('Sara Campos'),
    ('Vitória Alves'),
    ('Eva Quispe Apaza'),
    ('Natatcha Colette'),
    ('Marcos Roberto Piacente'),
    ('Telia Shecon'),
    ('Danila de Andrade Alves'),
    ('Edmar Aquotti'),
    ('Francisca Damásia Lopes'),
    ('Otávio Augusto do Prado'),
    ('Tania Lima de Paula Dias'),
    ('Maisa Brito da Silva'),
    ('Marcelo Paulo Gomes da Silva'),
    ('Gislanine de Moura Souza Onoratho'),
    ('Crisley Ferreira Viera'),
    ('Luiza Patriani'),
    ('Milena Batista'),
    ('Lucas Henrique Guimarães'),
    ('Raquel Pereira Oliveira'),
    ('Kamilla Guimarães'),
    ('Tatiana do Santos Oliveira'),
    ('Joseane Santos da Rocha'),
    ('Elson Magno'),
    ('Mateo Cavaliere'),
    ('Esther de Jesus Santana Medeiros'),
    ('Graziela Bernardes Jacob'),
    ('Thiago Adri'),
    ('Lorena Marinelli'),
    ('Guilherme Araújo'),
    ('Gabriela Martins Cardoso de Oliveira'),
    ('Sheila Chagas Bonfim'),
    ('Leicilene Gonçalves'),
    ('Andressa Alves Batista Curaçá'),
    ('Elda Queila de Oliveira'),
    ('Carlos Roberto F de Oliveira'),
    ('Giovanna Bellizia Seixas'),
    ('Elaine Lopes da Silva Oliveira'),
    ('Débora Lucas Oliveira da Silva'),
    ('Elias Moisés da Silva'),
    ('Gislene Portela'),
    ('Nicole Portela'),
    ('Amauri Oliveira'),
    ('Regina de Santana Ramos'),
    ('Davi Henrique Pessoa'),
    ('Tiago Madeira'),
    ('Joni Menoni'),
    ('Ana Carolina Silva Martins da Costa'),
    ('Cláudio Emerick de Andrade'),
    ('Pamela Martinelli Machado de Barros'),
    ('Camila Machado Rissotto'),
    ('Renato Alves da Silveira Junior'),
    ('Janaina Castro Silveira'),
    ('Leonardo da Costa'),
    ('Pedro de Carvalho Melo'),
    ('Nathália Aparecida Santos da Silva'),
    ('Devanir de Sá'),
    ('Berenice Alves de Amorim Lopes'),
    ('Felipe Ferreira Silva'),
    ('Rebeca Requena Gomes'),
    ('Scarlet Araujo Rosa'),
    ('Evelin da Silva Lima'),
    ('Erenilza Anunciação Aleluia'),
    ('Antônia Nery de Andrade'),
    ('Nair Pereira'),
    ('Diego Venceslau Wood'),
    ('Nivaldo do Santos Garcia'),
    ('Caroline Santos Silva'),
    ('Silvia de Souza Dias'),
    ('Felipe dos Santos Montinegro'),
    ('Carlos Alberto Rocha da Silva'),
    ('Augusto Rogerio'),
    ('Tatiane Viana Afonso'),
    ('Diego de Lima Silva')
  ) AS t(nome_bruto)
),

-- Normalização de pessoas do banco (mesmo algoritmo)
pessoas_norm AS (
  SELECT
    id,
    nome,
    lower(
      regexp_replace(
        translate(nome,
          'àáâãäåèéêëìíîïòóôõöùúûüýÿçñÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑ',
          'aaaaaaeeeeiiiioooooouuuuyyçnAAAAAAEEEEIIIIOOOOOOUUUUYYCN'
        ),
        '[^a-z0-9 ]', ' ', 'g'
      )
    ) AS nome_norm
  FROM public.pessoas
  WHERE deleted_at IS NULL
),

-- Para cada nome do PDF, buscar a melhor correspondência por similaridade
matches AS (
  SELECT DISTINCT ON (n.nome_bruto)
    n.nome_bruto,
    p.id        AS pessoa_id,
    p.nome      AS nome_banco,
    round(similarity(n.nome_norm, p.nome_norm)::numeric, 3) AS sim,
    CASE
      WHEN similarity(n.nome_norm, p.nome_norm) >= 0.80 THEN 'ALTO — importar'
      WHEN similarity(n.nome_norm, p.nome_norm) >= 0.55 THEN 'MÉDIO — revisar'
      ELSE                                                    'BAIXO — ignorar'
    END AS recomendacao,
    EXISTS (
      SELECT 1 FROM public.acesso_facial af WHERE af.pessoa_id = p.id
    ) AS ja_cadastrado
  FROM nomes_pdf n
  JOIN pessoas_norm p
    ON similarity(n.nome_norm, p.nome_norm) > 0.40
  ORDER BY n.nome_bruto, similarity(n.nome_norm, p.nome_norm) DESC
),

-- Nomes do PDF que não tiveram nenhum match acima de 0.40
sem_match AS (
  SELECT n.nome_bruto
  FROM nomes_pdf n
  LEFT JOIN matches m ON m.nome_bruto = n.nome_bruto
  WHERE m.nome_bruto IS NULL
)

-- Relatório completo
SELECT
  m.nome_bruto        AS "Nome do PDF",
  m.nome_banco        AS "Melhor match no banco",
  m.sim               AS "Similaridade",
  m.recomendacao      AS "Recomendação",
  CASE WHEN m.ja_cadastrado THEN 'Sim' ELSE 'Não' END AS "Já no acesso facial",
  m.pessoa_id         AS "UUID pessoa"
FROM matches m

UNION ALL

SELECT
  s.nome_bruto, '— sem correspondência —', 0, 'SEM MATCH — cadastrar manualmente', 'Não', NULL
FROM sem_match s

ORDER BY "Recomendação", "Nome do PDF";


-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 2 — INSERÇÃO dos matches com similaridade >= 0.55
-- Descomentar somente após revisar o relatório da FASE 1.
-- Usa ON CONFLICT DO NOTHING (respeita o UNIQUE em pessoa_id).
-- ─────────────────────────────────────────────────────────────────────────────

/*
WITH nomes_pdf AS (
  SELECT DISTINCT trim(nome_bruto) AS nome_bruto,
    lower(regexp_replace(translate(trim(nome_bruto),
      'àáâãäåèéêëìíîïòóôõöùúûüýÿçñÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑ',
      'aaaaaaeeeeiiiioooooouuuuyyçnAAAAAAEEEEIIIIOOOOOOUUUUYYCN'),
      '[^a-z0-9 ]', ' ', 'g')) AS nome_norm
  FROM (VALUES
    ('Rogerio de Castro Chaves'),('Laércio Ferreira Lima'),('Carlos Eduardo corrêa de lima'),
    ('Jean Carlos da silva'),('Persilio Deior'),('Euclides Portella da rocha'),
    ('Eni Beloti'),('Daniel simões de carvalho'),('Alberto Sinhiti noguti'),
    ('Marcus Vinicius Barros de Novais'),('Gustavo Diaz'),('Pablo Nunes santos'),
    ('Ely da Conceição Coelho'),('Jéssica Coelho'),('Gabriel Dias Marinho'),
    ('Kevin Verdugues miranda'),('Neiva afonso lima gomes'),('Sidney Ferreira Lima'),
    ('Hugo alcantara miguel'),('Carlos alberto de Paula santos'),('Yarian Santana'),
    ('Amanda Aparecida Ferreira Crevelanti'),('Caroline de Oliveira Cunha'),('Victor Maso'),
    ('Surama Cecília de Castro Ribeiro Lima'),('Daniel Felipe de Souza'),
    ('Ronaldo gomes da silva'),('Flavio Gallani'),('Marcio Damásio'),('Edson Luís Vieira'),
    ('Paulo Andrés Erben Castro'),('Arthur Alves de Moraes Miguel'),('Carlos Alberto Henrique'),
    ('Giulia Fuga Dal maso'),('Nathalia Maso'),('Danilo Lino do Santos'),
    ('Maressa Carolina Alonso'),('Ismael Molina'),('Poliana Rocha'),('Renata Rocha'),
    ('Cácio Evagelista da Silva'),('Sérgio Paulo crecchi'),('Guilherme de Oliveira Cunha'),
    ('Giovanna Couto Serafim'),('Jollyana Shiroma'),('Liliane Alves de Morais Miguel'),
    ('Karina Cavalieri de Novais'),('Raquel Cavalieri Lee'),('George Gomes Cunha'),
    ('Caíque Souza trindade'),('Lucas Henrique Tonkiel'),('Jackson Gean Guedes'),
    ('Jairo Isac Rodrigues'),('Angelica Santana Rodrigues'),('Michele Freitas Lima'),
    ('Edileuza Lino do Santos'),('Marcia Aparecida loreno molina'),('Gabriel assis brogim'),
    ('Isabelle Soranso Nappi Assis'),('Yuri Diego molina'),('Daniel Perreira Aguiar'),
    ('Matheus de Amorim Alves de Melo'),('Erika Lino de Melo'),('Agilson Alves de Oliveira'),
    ('Alexandre Carraleiro Martins'),('Adriano portella da Rocha'),('Fladimir Pessoa Martins'),
    ('Osias Vasconcelos Junior'),('Edclei Alves Brito'),('Hernan Sorio'),('Valdir Patriani'),
    ('Fábio Luiz de Carvalho'),('Sofia Souza Ramos de Oliveira'),('Gustavo Stroppa Mesquita'),
    ('Luis Roberto dos santos'),('Ricardo Riul'),('Tayna Faria'),
    ('João Marcos Moreira da Silva'),('Lucas Soranso D Nappe'),('Jhonatan Diego Santos Barreto'),
    ('Augusto Turim'),('Luiz Felipe de Almeida'),('Flavio Barreto Medeiros'),
    ('Aline Cristina Elidgio'),('Cicero Martins da Silva'),('Thiago Caputo Cavalieri'),
    ('Edson Menezes de Carvalho Júnior'),('Renata Rocha Vargas Henrique'),
    ('Tiago Rocha Vargas Henrique'),('Áurea Daré Vasconcelos'),('Max Filipe'),
    ('Poliana Rocha Vargas Henrique'),('Jennifer da Silva Langervisch'),
    ('Crispin Ariel Choquetarqui'),('Jéssica Wingerter Teixeira Coelho'),
    ('Maritza Benitta Surco Monrroy'),('Eder Góis de Oliveira'),('Camila Torres Cesar'),
    ('Deborah Alves de Moraes Miguel'),('Deise Maria Augusto'),('Dagmar Daré'),
    ('Hozea Barbosa Stroppa'),('Guilherme Mastro Pietro'),('Enrico Cavalieri Lee'),
    ('Rebeca Jacob Abdalla Pietro'),('Marcia Caputo Cavalieri'),
    ('Elisangela Gomes Oliveira da Silva'),('Selma Moreira Salles Lima'),
    ('Erlana Enriete Soares Auretil'),('Raquel Carvalho'),('Elisa Martins'),
    ('Isabely Yamani de Oliveira'),('Osvaldo Gabriel'),('Keila Yamani Eugenio'),
    ('Ivani do carmo oliveira da silva'),('Jair Alves pereira'),('Daniele Pires de Souza Wood'),
    ('Rosangela Barreto de Lima'),('Neuza Morais de castilho'),('Marli Marques de Oliveira'),
    ('Ozea Barbora Stroopa'),('Patricia Regina Alonso'),('Aparecida França de Macedo'),
    ('Fabio Thiago Alonso'),('Maria Izabel Proença'),('Josefa Alves da Silva'),
    ('Elisabete Araujo Pacifico da Silva'),('Eleaqum da Silva Trindade'),
    ('Glaucia Helena de Souza Pinto'),('Auzerina Vilela de Paula'),('Andrea Bento da Silva'),
    ('Catia Correa de Souza Araujo'),('Felipe Passos Santos Gomes de Araujo'),
    ('Luciana Duarte Srecchi'),('Percilia Coutinho Pereira Agliace'),
    ('Solange Deanna de Matos'),('Vera Lucia Agaphio Combertino'),
    ('Alessandra Bizeli Oliveira Sartori'),('Paula Cristina Rezende'),
    ('Geni do Nascimento Porto Simoes'),('Auria Dare Vasconcelos'),
    ('Sarah Strachicini Carvalho'),('Aline Pereira Cardoso Tavares'),
    ('Armando Pagliaci Junior'),('Maricia Tereza Gallani'),('Angelina Vieira Guimaraes'),
    ('Edna Francisco Ferraz'),('Gilberto Gallani Silva'),('Silmara Cardoso da Silva'),
    ('Roberto Salvattore Porto Simoes'),('Ana Claudia Trancolin Gallo'),
    ('Helena de Jesus Araujo'),('Ana Catarina Almeida Franco'),('Simone Soranso Nappi'),
    ('Mariza Alessandra Monsalles Aquetti'),('Wesley Silva Franco'),
    ('Marcia Diniz Soares Barbosa'),('Madalena Martins da Silva'),
    ('Cristina Gutierrez Fernandes'),('Maria Bezerra da Silva Sales'),
    ('Edgar Barbosa de Oliveira'),('Katia Valerio de Almeida'),('Alexandre Henrique Aquotti'),
    ('Tiago de Oliveira Evangelista'),('Maria Aparecida Mieto Rocha'),
    ('Lucia Saleste Costa Viera'),('Vitor Santos Góis de Oliveira'),('Maria do Carmo Alves'),
    ('Antônio Festas Miguel'),('Mariana Ferreira Lima'),('Matheus Wood'),
    ('Gabrielle Ferreira Lima'),('Ruthy da Rocha Miguel'),('Liza de souza Dias'),
    ('Ronaldo Ramos da Silva'),('Eliviado Viera'),('Tiago Rocha Vargas Enrico'),
    ('Silvana Aparecida sales Martins'),('Vinicius Tridico Hspanha Urban'),
    ('Ivani de Lourdes Sales Luiz'),('Zenaide Aparecida Pereira'),
    ('Daniela Aparecida de França Santo'),('Brenda Vilela Machado'),
    ('Ana Beatriz de Castro França'),('Cecília do Santos Santana'),
    ('Jesse Jorge Oliveira Santana'),('Fábio Perreira'),('Débora Ferreira'),
    ('Paulo Francisco da Silva'),('Onilda Batista Rocha'),('Max Filipe Silva Gonçalves'),
    ('Rebeca Cavalheire de Novais'),('Manuela Cavalheire de Novais'),
    ('Marlene de Fátima dos santos'),('Herminio Estevão ramos Rodrigues'),
    ('Jessyca da Silva Rodrigues'),('Vanilda carrasco Santa Cecilia'),
    ('Janaina Oliveira Simões de Carvalho'),('Liziene da Silva Oliveira'),
    ('Felipe Marcelo de Oliveira Caffeu'),('Simone Segna pinheiro Braga'),
    ('Nelson Alves Braga filho'),('Lucila Isabel Berduquerz Rodríguez'),
    ('Taise Viera Shingai Pinheiro'),('Jonathan Shingai Pinheiro'),
    ('Matheus Jorge Santana'),('José Viera Araújo'),('Ana Paula Gonçales Guariento'),
    ('Hillany Lourrane'),('Sara Campos'),('Vitória Alves'),('Eva Quispe Apaza'),
    ('Natatcha Colette'),('Marcos Roberto Piacente'),('Telia Shecon'),
    ('Danila de Andrade Alves'),('Edmar Aquotti'),('Francisca Damásia Lopes'),
    ('Otávio Augusto do Prado'),('Tania Lima de Paula Dias'),('Maisa Brito da Silva'),
    ('Marcelo Paulo Gomes da Silva'),('Gislanine de Moura Souza Onoratho'),
    ('Crisley Ferreira Viera'),('Luiza Patriani'),('Milena Batista'),
    ('Lucas Henrique Guimarães'),('Raquel Pereira Oliveira'),('Kamilla Guimarães'),
    ('Tatiana do Santos Oliveira'),('Joseane Santos da Rocha'),('Elson Magno'),
    ('Mateo Cavaliere'),('Esther de Jesus Santana Medeiros'),('Graziela Bernardes Jacob'),
    ('Thiago Adri'),('Lorena Marinelli'),('Guilherme Araújo'),
    ('Gabriela Martins Cardoso de Oliveira'),('Sheila Chagas Bonfim'),
    ('Leicilene Gonçalves'),('Andressa Alves Batista Curaçá'),('Elda Queila de Oliveira'),
    ('Carlos Roberto F de Oliveira'),('Giovanna Bellizia Seixas'),
    ('Elaine Lopes da Silva Oliveira'),('Débora Lucas Oliveira da Silva'),
    ('Elias Moisés da Silva'),('Gislene Portela'),('Nicole Portela'),('Amauri Oliveira'),
    ('Regina de Santana Ramos'),('Davi Henrique Pessoa'),('Tiago Madeira'),('Joni Menoni'),
    ('Ana Carolina Silva Martins da Costa'),('Cláudio Emerick de Andrade'),
    ('Pamela Martinelli Machado de Barros'),('Camila Machado Rissotto'),
    ('Renato Alves da Silveira Junior'),('Janaina Castro Silveira'),('Leonardo da Costa'),
    ('Pedro de Carvalho Melo'),('Nathália Aparecida Santos da Silva'),('Devanir de Sá'),
    ('Berenice Alves de Amorim Lopes'),('Felipe Ferreira Silva'),('Rebeca Requena Gomes'),
    ('Scarlet Araujo Rosa'),('Evelin da Silva Lima'),('Erenilza Anunciação Aleluia'),
    ('Antônia Nery de Andrade'),('Nair Pereira'),('Diego Venceslau Wood'),
    ('Nivaldo do Santos Garcia'),('Caroline Santos Silva'),('Silvia de Souza Dias'),
    ('Felipe dos Santos Montinegro'),('Carlos Alberto Rocha da Silva'),
    ('Augusto Rogerio'),('Tatiane Viana Afonso'),('Diego de Lima Silva')
  ) AS t(nome_bruto)
),
pessoas_norm AS (
  SELECT id, nome,
    lower(regexp_replace(translate(nome,
      'àáâãäåèéêëìíîïòóôõöùúûüýÿçñÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑ',
      'aaaaaaeeeeiiiioooooouuuuyyçnAAAAAAEEEEIIIIOOOOOOUUUUYYCN'),
      '[^a-z0-9 ]', ' ', 'g')) AS nome_norm
  FROM public.pessoas WHERE deleted_at IS NULL
),
melhores AS (
  SELECT DISTINCT ON (n.nome_bruto)
    n.nome_bruto, p.id AS pessoa_id
  FROM nomes_pdf n
  JOIN pessoas_norm p ON similarity(n.nome_norm, p.nome_norm) >= 0.55
  ORDER BY n.nome_bruto, similarity(n.nome_norm, p.nome_norm) DESC
)
INSERT INTO public.acesso_facial (pessoa_id, nome_importado, status, data_cadastro_facial)
SELECT
  m.pessoa_id,
  m.nome_bruto,
  'ativo',
  CURRENT_DATE
FROM melhores m
ON CONFLICT (pessoa_id) DO NOTHING;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Contagem pós-inserção (confirmar resultado)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT count(*) AS total_importados FROM public.acesso_facial;
