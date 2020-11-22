const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config')
const { validationResult, check } = require('express-validator');
const User = require('../../models/User');

//@route   GET api/auth
//@desc    Get User by token
//@access  Private
router.get('/', auth, async (req, res) => {

    try {
        const user = await User.findById(req.user.id).select('-password'); // req.user.id is the jwt payload 
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' })
    }
});

//@route   POST api/auth
//@desc    Login a User
//@access  Public
router.post('/', [
    check('email', 'Enter a valid email address').isEmail(),

    check('password', 'Password is required')
        .exists()

], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {

        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ errors: { msg: 'Invalid email or password' } });
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(400).json({ error: { msg: 'Invalid email or password' } });
        }

        const payload = {
            user: {
                id: user.id
            }
        }

        jwt.sign(payload, config.get('jwtsecret'), { expiresIn: 360000 },
            (err, token) => {
                if (err)
                    throw err;
                res.json({ token })
            })
    } catch (error) {
        console.log(error.message);
        res.status(500).json('Internal Server Error');
    }


});

module.exports = router;