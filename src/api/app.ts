import express from 'express';
import { healthRoutes, hotelRoutes, supplierRoutes } from './routes';
import { requestLogger, errorHandler } from './middleware';
const app = express();

app.use(express.json());
app.use(requestLogger);

app.use(healthRoutes)
app.use(supplierRoutes);
app.use(hotelRoutes)


// Error handler must be registered after all routes.
app.use(errorHandler);

export { app };