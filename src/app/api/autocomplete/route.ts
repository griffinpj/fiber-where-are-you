import { NextRequest, NextResponse } from 'next/server';
import { AutocompleteService } from '@/lib/services/autocomplete';
import { validateCSRFToken } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  // Validate CSRF token for autocomplete requests
  if (!(await validateCSRFToken(request))) {
    return NextResponse.json(
      { error: 'Invalid or missing CSRF token' },
      { status: 403 }
    );
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limitParam = searchParams.get('limit');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    if (query.length < 3) {
      return NextResponse.json({
        suggestions: [],
        meta: {
          query,
          count: 0,
          minLength: 3,
        },
      });
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    const suggestions = await AutocompleteService.getSuggestions(query, limit);

    return NextResponse.json({
      suggestions,
      meta: {
        query,
        count: suggestions.length,
        sources: [...new Set(suggestions.map(s => s.source))],
        searchedAt: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Autocomplete API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error occurred during autocomplete',
        suggestions: [],
      },
      { status: 500 }
    );
  }
}