import type { Response } from 'express';

export interface SuccessEnvelope<T> {
  success: true;
  statusCode: number;
  data: T;
}

export interface ErrorEnvelope {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    issues?: Array<{ path: string; message: string }>;
  };
}

export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export type IssueItem = { path: string; message: string };

/** Sends a 200 (or custom) success envelope. */
export function ok<T>(res: Response, data: T, statusCode = 200): void {
  const body: SuccessEnvelope<T> = { success: true, statusCode, data };
  res.status(statusCode).json(body);
}

/** Sends a 201 success envelope. */
export function created<T>(res: Response, data: T): void {
  ok(res, data, 201);
}

/** Sends an error envelope with the given status, code and human message. */
export function fail(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  issues?: IssueItem[],
): void {
  const body: ErrorEnvelope = {
    success: false,
    statusCode,
    error: issues ? { code, message, issues } : { code, message },
  };
  res.status(statusCode).json(body);
}