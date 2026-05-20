class ApiError extends Error {
  constructor(message = 'Internal Server Error', statusCode = 500, errorCode = 'ERR_INTERNAL') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // operational vs programming error
    Error.captureStackTrace(this, this.constructor);
  }

  markNonOperational() {
    this.isOperational = false;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      isOperational: this.isOperational
    };
  }

  log() {
    // Centralized logging hook - can be extended to use external loggers
    if (process.env.NODE_ENV === 'development') {
      console.error(this.stack);
    } else {
      // production: minimal logging
      console.error(`${this.name}: ${this.message}`);
    }
  }
}

module.exports = ApiError;
