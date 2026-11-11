const router = require('express').Router();
const ctrl = require('../controllers/products.controller');
const { requireAdmin } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', requireAdmin, ctrl.create);
router.put('/:id', requireAdmin, ctrl.update);
router.delete('/:id', requireAdmin, ctrl.remove);

module.exports = router;
