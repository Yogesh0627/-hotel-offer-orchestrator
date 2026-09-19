export class AppError extends Error {
    public readonly success = false;
    constructor(
        public readonly statusCode: number,
        message: string,
    ) {
        super(message);
        this.name = 'AppError';
    }
}