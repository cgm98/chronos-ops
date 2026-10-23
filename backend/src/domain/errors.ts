export class AppError extends Error {
  constructor(message: string, public readonly status: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Datos inválidos') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}
