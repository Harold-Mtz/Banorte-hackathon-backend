import { Router } from 'express';

import { GeminiClient } from '../ai/gemini-client';

const router = Router();

const gemini = new GeminiClient();

router.get('/', async (_req, res) => {

  try {

    const response =
      await gemini.generate([
        {
          role: 'system',
          content:
            'You are a financial assistant.'
        },

        {
          role: 'user',
          content:
            'Say only: Gemini connected successfully'
        }
      ]);

    return res.status(200).json({
      success: true,
      data: {
        response
      }
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      error: {
        code: 'GEMINI_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Unknown Gemini error'
      }
    });
  }
});

export default router;