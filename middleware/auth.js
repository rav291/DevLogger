const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {

    const token = req.header('x-auth-token');

    if (!token)
        return res.status(401).json({ msg: 'Unauthorized access' })

    try {
        const decoded = jwt.verify(token, config.get('jwtsecret'));

        req.user = decoded.user;
        next();
    } catch (error) {
        return res.status(401).json({ msg: 'Invalid Token' })
    }

}






