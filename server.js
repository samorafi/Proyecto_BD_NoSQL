// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { auth } = require('./middleware/auth');
const app = express();

// ===== Middleware =====
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookieParser());

// ===== Conexión a MongoDB =====
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de conexión:', err));

// ===== Rutas API =====
const tareasRoutes = require('./routes/tareas.routes');
const authRoutes = require('./routes/auth.routes');
const logsRoutes = require('./routes/logs.routes');
const estadisticasRoutes = require('./routes/estadisticas.routes');
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/auth', authRoutes);

const usersRoutes = require('./routes/users.routes');
app.use('/api/users', usersRoutes);
app.get('/perfil.html', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'perfil.html'));
});

const adminUsersRoutes = require('./routes/admin.users.routes');
app.use('/api/admin', adminUsersRoutes);

const equiposRoutes = require('./routes/equipo.routes');
app.use('/api/equipos', equiposRoutes);

// Vista de equipos
app.get('/equipos.html', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'equipos.html'));
});


app.get('/admin-usuarios.html', auth(true), (req, res) => {
  if ((req.user?.rolNombre || '').toLowerCase() !== 'administrador') {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'view', 'admin-usuarios.html'));
});

// server.js
const cursosRoutes = require('./routes/cursos.routes');
app.use('/api/cursos', cursosRoutes);


app.get('/cursos.html', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'cursos.html'));
});

app.get('/crear-curso.html', auth(true), (req, res) => {
  if ((req.user?.rolNombre || '').toLowerCase() !== 'administrador') {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'view', 'crear-curso.html'));
});

app.get('/proyecto-detalle.html', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'proyecto-detalle.html'));
});

app.get('/proyectos/:id', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'proyecto-detalle.html'));
});

const proyectosRoutes = require('./routes/proyecto.routes');
app.use('/api/proyectos', proyectosRoutes);

app.get('/proyectos.html', auth(true), (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'proyectos.html'));
});

app.get('/proyectos/:id', auth(true), (req,res)=>{
  res.sendFile(path.join(__dirname,'view','proyecto-detalle.html'));
});

app.get('/editar-curso.html', auth(true), (req,res)=>res.sendFile(path.join(__dirname,'view','editar-curso.html')));



app.use(express.static(path.join(__dirname, 'view'), { index: false }));

// ===== Raíz: redirige a login o dashboard según sesión =====
// auth(false) = no obliga, solo parsea el token si existe
app.get('/', auth(false), (req, res) => {
  if (req.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/login.html');
});

// ===== Dashboard protegido: sirve la vista según rol =====
app.get('/dashboard', auth(true), (req, res) => {
  const rol = (req.user && req.user.rolNombre) || 'estudiante';
  let file = 'index-estudiante.html';
  if (rol === 'profesor') file = 'index-profesor.html';
  if (rol === 'administrador') file = 'index-admin.html';
  res.sendFile(path.join(__dirname, 'view', file));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'login.html'));
});

app.get(['/index.html', '/index-estudiante.html', '/index-profesor.html', '/index-admin.html'], (req, res) => {
  return res.redirect('/');
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'view', 'register.html'));
});

// ===== Server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});