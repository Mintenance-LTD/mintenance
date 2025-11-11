import { NextRequest, NextResponse } from 'next/server';
import { requireCSRF } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    
    // CSRF protection
    await requireCSRF(request);
const { text, model = 'text-embedding-3-small' } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // For now, return a mock embedding
    // In production, this would call OpenAI's API
    // Example: const response = await openai.embeddings.create({ model, input: text });

    const mockEmbedding = Array.from({ length: 1536 }, () => Math.random());

    return NextResponse.json({
      embedding: mockEmbedding,
      model,
    });
  } catch (error) {
    console.error('Embedding generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}
