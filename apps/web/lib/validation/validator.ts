/**
 * Request Validation Middleware
 * 
 * Helper functions for validating request data using Zod schemas
 */

import { z, ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validate request body against a schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: ValidationError[] = error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return {
        success: false,
        errors,
      };
    }
    
    return {
      success: false,
      errors: [{ field: 'body', message: 'Invalid request body' }],
    };
  }
}

/**
 * Validate query parameters against a schema
 */
export function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    const data = schema.parse(params);
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors: ValidationError[] = error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return {
        success: false,
        errors,
      };
    }
    
    return {
      success: false,
      errors: [{ field: 'query', message: 'Invalid query parameters' }],
    };
  }
}

/**
 * Create error response for validation failures
 */
export function createValidationErrorResponse(errors: ValidationError[]): NextResponse {
  return NextResponse.json(
    {
      error: 'Validation failed',
      errors,
    },
    { status: 400 }
  );
}

/**
 * Validate and extract request data (helper function)
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  source: 'body' | 'query' = 'body'
): Promise<{ data: T } | NextResponse> {
  const result = source === 'body'
    ? await validateRequestBody(request, schema)
    : validateQueryParams(request, schema);
  
  if (!result.success || !result.data) {
    return createValidationErrorResponse(result.errors || []);
  }
  
  return { data: result.data };
}

