const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const equipos = require('../controllers/equipos.controller');

router.use((req,res,next)=>auth(true)(req,res,next));

router.get('/',       equipos.listByProyecto); 
router.get('/:id',    equipos.getById);
router.post('/',      equipos.create);
router.put('/:id',    equipos.update);
router.delete('/:id', equipos.remove);

module.exports = router;
