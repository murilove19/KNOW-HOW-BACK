const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'know-how.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS instituicoes (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    nome  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nome            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    ra              TEXT NOT NULL UNIQUE,
    senha           TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('aluno','professor','instituicao','admin')),
    instituicao_id  INTEGER REFERENCES instituicoes(id),
    primeiro_acesso INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS turmas (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nome           TEXT NOT NULL,
    professor_id   INTEGER NOT NULL REFERENCES profiles(id),
    instituicao_id INTEGER NOT NULL REFERENCES instituicoes(id)
  );

  CREATE TABLE IF NOT EXISTS matriculas (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id INTEGER NOT NULL REFERENCES profiles(id),
    turma_id INTEGER NOT NULL REFERENCES turmas(id),
    ativo    INTEGER NOT NULL DEFAULT 1,
    UNIQUE(aluno_id, turma_id)
  );

  CREATE TABLE IF NOT EXISTS modulos (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo        TEXT NOT NULL,
    descricao     TEXT,
    professor_id  INTEGER NOT NULL REFERENCES profiles(id),
    turma_id      INTEGER NOT NULL REFERENCES turmas(id),
    nota_minima   REAL NOT NULL DEFAULT 7,
    gera_horas    INTEGER NOT NULL DEFAULT 1,
    horas_maximas REAL NOT NULL DEFAULT 4,
    data_inicio   TEXT,
    data_fim      TEXT,
    cor           TEXT DEFAULT '#2563EB'
  );

  CREATE TABLE IF NOT EXISTS atividades (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    modulo_id    INTEGER NOT NULL REFERENCES modulos(id),
    professor_id INTEGER NOT NULL REFERENCES profiles(id),
    titulo       TEXT NOT NULL,
    descricao    TEXT,
    tipo_horas   TEXT DEFAULT 'academica',
    data_inicio  TEXT,
    data_fim     TEXT,
    duracao      INTEGER NOT NULL DEFAULT 300
  );

  CREATE TABLE IF NOT EXISTS questoes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    atividade_id     INTEGER NOT NULL REFERENCES atividades(id),
    enunciado        TEXT NOT NULL,
    alternativas     TEXT NOT NULL,
    resposta_correta INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tentativas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id     INTEGER NOT NULL REFERENCES profiles(id),
    atividade_id INTEGER NOT NULL REFERENCES atividades(id),
    respostas    TEXT NOT NULL,
    nota         REAL NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS certificados (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    aluno_id   INTEGER NOT NULL REFERENCES profiles(id),
    modulo_id  INTEGER NOT NULL REFERENCES modulos(id),
    emitido_em TEXT NOT NULL DEFAULT (date('now')),
    UNIQUE(aluno_id, modulo_id)
  );

  CREATE TABLE IF NOT EXISTS conteudos (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    modulo_id INTEGER NOT NULL REFERENCES modulos(id),
    tipo      TEXT NOT NULL CHECK(tipo IN ('PDF','DOC','PPT','VIDEO','LINK')),
    url       TEXT NOT NULL,
    titulo    TEXT
  );
`);

// Seed — só roda se o banco estiver vazio
const seed = db.transaction(() => {
  const count = db.prepare('SELECT COUNT(*) as n FROM profiles').get();
  if (count.n > 0) return;

  db.prepare(`INSERT INTO instituicoes (id,nome) VALUES (1,'Faculdade Know-How')`).run();

  const perfis = [
    { id:1, nome:'Admin Geral',         email:'admin@knowhow.com',  ra:'ADM001', senha:'admin123', role:'admin',     primeiro_acesso:0 },
    { id:2, nome:'Prof. Carlos Mendes', email:'carlos@knowhow.com', ra:'PRF001', senha:'prof123',  role:'professor', primeiro_acesso:0 },
    { id:3, nome:'Angela Lima',         email:'angela@knowhow.com', ra:'ALU001', senha:'123456',   role:'aluno',     primeiro_acesso:0 },
    { id:4, nome:'Bruno Salave',        email:'bruno@knowhow.com',  ra:'ALU002', senha:'abc123',   role:'aluno',     primeiro_acesso:0 },
  ];
  const insP = db.prepare(`INSERT INTO profiles (id,nome,email,ra,senha,role,instituicao_id,primeiro_acesso) VALUES (@id,@nome,@email,@ra,@senha,@role,1,@primeiro_acesso)`);
  perfis.forEach(p => insP.run(p));

  db.prepare(`INSERT INTO turmas (id,nome,professor_id,instituicao_id) VALUES (1,'Programação Web',2,1)`).run();
  db.prepare(`INSERT INTO turmas (id,nome,professor_id,instituicao_id) VALUES (2,'Banco de Dados',2,1)`).run();

  db.prepare(`INSERT INTO matriculas (aluno_id,turma_id) VALUES (3,1)`).run();
  db.prepare(`INSERT INTO matriculas (aluno_id,turma_id) VALUES (3,2)`).run();
  db.prepare(`INSERT INTO matriculas (aluno_id,turma_id) VALUES (4,1)`).run();

  const mods = [
    { id:1, titulo:'SQL na prática',  descricao:'Aprenda SQL do zero ao avançado', professor_id:2, turma_id:1, nota_minima:7, gera_horas:1, horas_maximas:4, data_inicio:'2025-01-01', data_fim:'2025-12-31', cor:'#2563EB' },
    { id:2, titulo:'POO com Python',  descricao:'Programação Orientada a Objetos', professor_id:2, turma_id:1, nota_minima:7, gera_horas:1, horas_maximas:3, data_inicio:'2025-01-01', data_fim:'2025-12-31', cor:'#7C3AED' },
    { id:3, titulo:'MongoDB Basics',  descricao:'Banco NoSQL com MongoDB',          professor_id:2, turma_id:2, nota_minima:6, gera_horas:1, horas_maximas:2, data_inicio:'2025-01-01', data_fim:'2025-12-31', cor:'#0D9488' },
  ];
  const insM = db.prepare(`INSERT INTO modulos (id,titulo,descricao,professor_id,turma_id,nota_minima,gera_horas,horas_maximas,data_inicio,data_fim,cor) VALUES (@id,@titulo,@descricao,@professor_id,@turma_id,@nota_minima,@gera_horas,@horas_maximas,@data_inicio,@data_fim,@cor)`);
  mods.forEach(m => insM.run(m));

  const ativs = [
    { id:1, modulo_id:1, professor_id:2, titulo:'Quiz: SELECT e JOIN',        descricao:'Consultas SQL',      tipo_horas:'academica', data_inicio:'2025-01-01', data_fim:'2025-12-31', duracao:300 },
    { id:2, modulo_id:1, professor_id:2, titulo:'Quiz: Índices e Performance', descricao:'Otimização SQL',     tipo_horas:'academica', data_inicio:'2025-01-01', data_fim:'2025-12-31', duracao:240 },
    { id:3, modulo_id:2, professor_id:2, titulo:'Quiz: Classes e Objetos',     descricao:'Fundamentos POO',    tipo_horas:'academica', data_inicio:'2025-01-01', data_fim:'2025-12-31', duracao:300 },
    { id:4, modulo_id:3, professor_id:2, titulo:'Quiz: CRUD no MongoDB',       descricao:'MongoDB básico',     tipo_horas:'academica', data_inicio:'2025-01-01', data_fim:'2025-12-31', duracao:200 },
  ];
  const insA = db.prepare(`INSERT INTO atividades (id,modulo_id,professor_id,titulo,descricao,tipo_horas,data_inicio,data_fim,duracao) VALUES (@id,@modulo_id,@professor_id,@titulo,@descricao,@tipo_horas,@data_inicio,@data_fim,@duracao)`);
  ativs.forEach(a => insA.run(a));

  const questoes = [
    { id:1, atividade_id:1, enunciado:'Qual comando SQL é usado para buscar dados?',         alternativas:'["INSERT","SELECT","UPDATE","DELETE"]', resposta_correta:1 },
    { id:2, atividade_id:1, enunciado:'O que faz um JOIN no SQL?',                            alternativas:'["Divide tabelas","Combina dados de múltiplas tabelas","Deleta duplicados","Cria índices"]', resposta_correta:1 },
    { id:3, atividade_id:1, enunciado:'O que é PRIMARY KEY?',                                 alternativas:'["Chave de criptografia","Identificador único de cada linha","Índice secundário","Campo obrigatório"]', resposta_correta:1 },
    { id:4, atividade_id:2, enunciado:'O que é um índice no banco de dados?',                 alternativas:'["Tabela auxiliar","Estrutura para acelerar buscas","Chave estrangeira","Relatório gerado"]', resposta_correta:1 },
    { id:5, atividade_id:2, enunciado:'Quando NÃO usar índice?',                              alternativas:'["Colunas muito consultadas","Colunas com poucos valores distintos","Chaves primárias","Colunas de busca frequente"]', resposta_correta:1 },
    { id:6, atividade_id:3, enunciado:'O que é uma classe em POO?',                           alternativas:'["Arquivo de código","Molde para criar objetos","Método especial","Variável global"]', resposta_correta:1 },
    { id:7, atividade_id:3, enunciado:'O que é herança em POO?',                              alternativas:'["Reutilizar métodos de outra classe","Criar variáveis globais","Destruir objetos","Chamar funções externas"]', resposta_correta:0 },
    { id:8, atividade_id:4, enunciado:'Qual método insere um documento no MongoDB?',           alternativas:'["db.insert()","db.collection.insertOne()","db.add()","db.push()"]', resposta_correta:1 },
    { id:9, atividade_id:4, enunciado:'Como buscar todos os documentos de uma coleção?',       alternativas:'["db.find({})","db.getAll()","db.select(*)","db.fetch()"]', resposta_correta:0 },
  ];
  const insQ = db.prepare(`INSERT INTO questoes (id,atividade_id,enunciado,alternativas,resposta_correta) VALUES (@id,@atividade_id,@enunciado,@alternativas,@resposta_correta)`);
  questoes.forEach(q => insQ.run(q));

  console.log('✅ Banco criado e populado com dados iniciais!');
});

seed();

module.exports = db;
