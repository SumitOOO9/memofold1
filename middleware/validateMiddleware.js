module.exports = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(400).json({
        status: false,
        message: error.details[0].message,
      });
    }

    next();
  };
};
