import express from 'express';
const router = express.Router();
import { QuorumService, QuorumError } from '../services/QuorumService.js';

function handle(res, fn) {
  try {
    res.json(fn());
  } catch (err) {
    if (err instanceof QuorumError) {
      return res.status(err.status).json({ code: err.status, message: err.message });
    }
    console.error(err);
    res.status(500).json({ code: 500, message: 'Error interno.' });
  }
}

router.post('/quorum', (req, res) => {
  handle(res, () => ({ session: QuorumService.createSession(req.body ?? {}) }));
});

router.get('/quorum/:date', (req, res) => {
  handle(res, () => QuorumService.getSession(req.params.date));
});

router.delete('/quorum/:date', (req, res) => {
  handle(res, () => {
    QuorumService.closeSession(req.params.date);
    return { closed: true };
  });
});

router.put('/quorum/:date/availability/:profileId', (req, res) => {
  handle(res, () => ({
    availability: QuorumService.setAvailability(req.params.date, Number(req.params.profileId), req.body ?? {}),
  }));
});

router.delete('/quorum/:date/availability/:profileId', (req, res) => {
  handle(res, () => ({
    availability: QuorumService.clearAvailability(req.params.date, Number(req.params.profileId)),
  }));
});

export default router;
