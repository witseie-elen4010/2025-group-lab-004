exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next()
  }

  res.redirect('/login') // or res.status(401).send('Unauthorized')
}
