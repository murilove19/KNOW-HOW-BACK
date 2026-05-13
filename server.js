const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── AUTH ──────────────────────────────────────────────────────────────────────

app.post('/api/login', (req, res) => {
  const { ra, senha } = req.body;
  if (!ra || !senha) return res.status(400).json({ erro: 'RA e senha obrigatórios' });
  const user = db.prepare('SELECT * FROM profiles WHERE ra = ? AND senha = ?').get(ra, senha);
  if (!user) return res.status(401).json({ erro: 'RA ou senha incorretos' });
  res.json({ usuario: user });
});

app.put('/api/trocar-senha', (req, res) => {
  const { id, novaSenha } = req.body;
  if (!id || !novaSenha) return res.status(400).json({ erro: 'Dados incompletos' });
  db.prepare('UPDATE profiles SET senha = ?, primeiro_acesso = 0 WHERE id = ?').run(novaSenha, id);
  res.json(db.prepare('SELECT * FROM profiles WHERE id = ?').get(id));
});

// ── PROFILES ──────────────────────────────────────────────────────────────────

app.get('/api/profiles', (req, res) => {
  const { role } = req.query;
  if (role) return res.json(db.prepare('SELECT * FROM profiles WHERE role = ?').all(role));
  res.json(db.prepare('SELECT * FROM profiles').all());
});

app.get('/api/profiles/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ erro: 'Não encontrado' });
  res.json(user);
});

app.post('/api/profiles', (req, res) => {
  const { nome, email, ra, senha, role, instituicao_id } = req.body;
  if (!nome || !email || !ra || !senha) return res.status(400).json({ erro: 'Dados incompletos' });
  try {
    const r = db.prepare(`INSERT INTO profiles (nome,email,ra,senha,role,instituicao_id,primeiro_acesso) VALUES (?,?,?,?,?,?,1)`).run(nome, email, ra, senha, role||'aluno', instituicao_id||1);
    res.status(201).json(db.prepare('SELECT * FROM profiles WHERE id = ?').get(r.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ erro: 'RA ou email já cadastrado' });
  }
});

// ── TURMAS ────────────────────────────────────────────────────────────────────

app.get('/api/turmas', (req, res) => {
  const { professor_id } = req.query;
  if (professor_id) return res.json(db.prepare('SELECT * FROM turmas WHERE professor_id = ?').all(professor_id));
  res.json(db.prepare('SELECT * FROM turmas').all());
});

app.post('/api/turmas', (req, res) => {
  const { nome, professor_id, instituicao_id } = req.body;
  if (!nome || !professor_id) return res.status(400).json({ erro: 'Dados incompletos' });
  const r = db.prepare('INSERT INTO turmas (nome,professor_id,instituicao_id) VALUES (?,?,?)').run(nome, professor_id, instituicao_id||1);
  res.status(201).json(db.prepare('SELECT * FROM turmas WHERE id = ?').get(r.lastInsertRowid));
});

// ── MATRÍCULAS ────────────────────────────────────────────────────────────────

app.get('/api/matriculas', (req, res) => {
  const { turma_id, aluno_id } = req.query;
  if (turma_id) {
    return res.json(db.prepare(`
      SELECT m.*, p.nome, p.email, p.ra FROM matriculas m
      JOIN profiles p ON p.id = m.aluno_id WHERE m.turma_id = ?
    `).all(turma_id));
  }
  if (aluno_id) return res.json(db.prepare('SELECT * FROM matriculas WHERE aluno_id = ? AND ativo = 1').all(aluno_id));
  res.json(db.prepare('SELECT * FROM matriculas').all());
});

app.post('/api/matriculas', (req, res) => {
  const { ra, turma_id } = req.body;
  if (!ra || !turma_id) return res.status(400).json({ erro: 'Dados incompletos' });
  const aluno = db.prepare("SELECT * FROM profiles WHERE ra = ? AND role = 'aluno'").get(ra);
  if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
  try {
    db.prepare('INSERT INTO matriculas (aluno_id,turma_id) VALUES (?,?)').run(aluno.id, turma_id);
    res.status(201).json({ mensagem: 'Matriculado!', aluno });
  } catch (e) {
    res.status(400).json({ erro: 'Aluno já matriculado' });
  }
});

// ── MÓDULOS ───────────────────────────────────────────────────────────────────

app.get('/api/modulos', (req, res) => {
  const { aluno_id, turma_id } = req.query;
  if (aluno_id) {
    return res.json(db.prepare(`
      SELECT DISTINCT mo.* FROM modulos mo
      JOIN turmas t ON t.id = mo.turma_id
      JOIN matriculas ma ON ma.turma_id = t.id
      WHERE ma.aluno_id = ? AND ma.ativo = 1
    `).all(aluno_id));
  }
  if (turma_id) return res.json(db.prepare('SELECT * FROM modulos WHERE turma_id = ?').all(turma_id));
  res.json(db.prepare('SELECT * FROM modulos').all());
});

app.post('/api/modulos', (req, res) => {
  const { titulo, descricao, professor_id, turma_id, nota_minima, gera_horas, horas_maximas, data_inicio, data_fim, cor } = req.body;
  if (!titulo || !professor_id || !turma_id) return res.status(400).json({ erro: 'Dados incompletos' });
  const r = db.prepare(`INSERT INTO modulos (titulo,descricao,professor_id,turma_id,nota_minima,gera_horas,horas_maximas,data_inicio,data_fim,cor) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(titulo, descricao, professor_id, turma_id, nota_minima||7, gera_horas||1, horas_maximas||4, data_inicio, data_fim, cor||'#2563EB');
  res.status(201).json(db.prepare('SELECT * FROM modulos WHERE id = ?').get(r.lastInsertRowid));
});

// ── ATIVIDADES ────────────────────────────────────────────────────────────────

app.get('/api/atividades', (req, res) => {
  const { modulo_id } = req.query;
  if (modulo_id) return res.json(db.prepare('SELECT * FROM atividades WHERE modulo_id = ?').all(modulo_id));
  res.json(db.prepare('SELECT * FROM atividades').all());
});

app.post('/api/atividades', (req, res) => {
  const { modulo_id, professor_id, titulo, descricao, tipo_horas, data_inicio, data_fim, duracao } = req.body;
  if (!modulo_id || !titulo) return res.status(400).json({ erro: 'Dados incompletos' });
  const r = db.prepare(`INSERT INTO atividades (modulo_id,professor_id,titulo,descricao,tipo_horas,data_inicio,data_fim,duracao) VALUES (?,?,?,?,?,?,?,?)`).run(modulo_id, professor_id, titulo, descricao, tipo_horas||'academica', data_inicio, data_fim, duracao||300);
  res.status(201).json(db.prepare('SELECT * FROM atividades WHERE id = ?').get(r.lastInsertRowid));
});

// ── QUESTÕES ──────────────────────────────────────────────────────────────────

app.get('/api/questoes', (req, res) => {
  const { atividade_id } = req.query;
  if (!atividade_id) return res.status(400).json({ erro: 'atividade_id obrigatório' });
  const rows = db.prepare('SELECT * FROM questoes WHERE atividade_id = ?').all(atividade_id);
  res.json(rows.map(q => ({ ...q, alternativas: JSON.parse(q.alternativas) })));
});

app.post('/api/questoes', (req, res) => {
  const { atividade_id, enunciado, alternativas, resposta_correta } = req.body;
  if (!atividade_id || !enunciado || !alternativas) return res.status(400).json({ erro: 'Dados incompletos' });
  const r = db.prepare('INSERT INTO questoes (atividade_id,enunciado,alternativas,resposta_correta) VALUES (?,?,?,?)').run(atividade_id, enunciado, JSON.stringify(alternativas), resposta_correta);
  res.status(201).json(db.prepare('SELECT * FROM questoes WHERE id = ?').get(r.lastInsertRowid));
});

// ── TENTATIVAS ────────────────────────────────────────────────────────────────

app.get('/api/tentativas', (req, res) => {
  const { aluno_id } = req.query;
  if (!aluno_id) return res.status(400).json({ erro: 'aluno_id obrigatório' });
  res.json(db.prepare('SELECT * FROM tentativas WHERE aluno_id = ? ORDER BY created_at DESC').all(aluno_id));
});

app.post('/api/tentativas', (req, res) => {
  const { aluno_id, atividade_id, respostas, nota } = req.body;
  if (!aluno_id || !atividade_id || respostas === undefined || nota === undefined)
    return res.status(400).json({ erro: 'Dados incompletos' });

  const r = db.prepare('INSERT INTO tentativas (aluno_id,atividade_id,respostas,nota) VALUES (?,?,?,?)').run(aluno_id, atividade_id, JSON.stringify(respostas), nota);

  // Emite certificado se nota >= nota_minima do módulo
  const ativ = db.prepare('SELECT * FROM atividades WHERE id = ?').get(atividade_id);
  const mod  = db.prepare('SELECT * FROM modulos WHERE id = ?').get(ativ.modulo_id);
  let certificado = null;
  if (nota >= mod.nota_minima) {
    db.prepare('INSERT OR IGNORE INTO certificados (aluno_id,modulo_id) VALUES (?,?)').run(aluno_id, mod.id);
    certificado = db.prepare('SELECT * FROM certificados WHERE aluno_id = ? AND modulo_id = ?').get(aluno_id, mod.id);
  }

  res.status(201).json({
    tentativa: db.prepare('SELECT * FROM tentativas WHERE id = ?').get(r.lastInsertRowid),
    certificado
  });
});

// ── CERTIFICADOS ──────────────────────────────────────────────────────────────

app.get('/api/certificados', (req, res) => {
  const { aluno_id } = req.query;
  if (!aluno_id) return res.status(400).json({ erro: 'aluno_id obrigatório' });
  res.json(db.prepare(`
    SELECT c.*, m.titulo as modulo_titulo FROM certificados c
    JOIN modulos m ON m.id = c.modulo_id WHERE c.aluno_id = ?
  `).all(aluno_id));
});

// ── STATS ─────────────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  res.json({
    alunos:      db.prepare("SELECT COUNT(*) as n FROM profiles WHERE role='aluno'").get().n,
    professores: db.prepare("SELECT COUNT(*) as n FROM profiles WHERE role='professor'").get().n,
    turmas:      db.prepare('SELECT COUNT(*) as n FROM turmas').get().n,
    modulos:     db.prepare('SELECT COUNT(*) as n FROM modulos').get().n,
    atividades:  db.prepare('SELECT COUNT(*) as n FROM atividades').get().n,
    tentativas:  db.prepare('SELECT COUNT(*) as n FROM tentativas').get().n,
  });
});

// ── START ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Know-How API rodando em http://localhost:${PORT}`);
  console.log(`📦 Banco: know-how.db`);
});
