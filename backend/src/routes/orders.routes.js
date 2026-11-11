const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/orders.controller');
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/auth');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos seguidos. Espera unos minutos' },
});

router.post('/', limiter, optionalAuth, ctrl.create);
router.get('/mine', requireAuth, ctrl.mine);
router.get('/', requireAdmin, ctrl.all);

module.exports = router;
