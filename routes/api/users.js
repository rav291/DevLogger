const express = require('express');
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config')

const { validationResult, check } = require('express-validator');
const User = require('../../models/User');
const router = express.Router();

//@route   POST api/users
//@desc    Register a User
//@access  Public
router.post('/', [
    check('name', 'Name cannot be empty').not().isEmpty(),

    check('email', 'Enter a valid email address').isEmail(),

    check('password', 'Password cannot be less than 6 characters')
        .isLength({ min: 6 })

], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {

        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ errors: { msg: 'User Already Exists' } });
        }

        const avatar = gravatar.url(email, {
            s: 200,
            r: 'pg',
            d: 'mm'
        })

        user = new User({
            name,
            email,
            avatar,
            password
        })

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

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