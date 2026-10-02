// backend/src/middleware/validate.middleware.js
// Middleware para validación y sanitización de datos de entrada usando Zod

export const validateBody = (schema) => (req, res, next) => {
  try {
    const parsedData = schema.parse(req.body);
    req.body = parsedData; // asigna los datos parseados y coercidos
    next();
  } catch (error) {
    if (error.errors && Array.isArray(error.errors)) {
      const formattedErrors = error.errors.map(err => {
        const field = err.path.join('.');
        return field ? `${field}: ${err.message}` : err.message;
      });
      return res.status(400).json({
        error: formattedErrors.join(' | '),
        detalles: error.errors
      });
    }
    return res.status(400).json({ error: 'Datos de solicitud inválidos.' });
  }
};
