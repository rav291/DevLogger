const express = require('express');
const config = require('config');
const axios = require('axios');
const auth = require('../../middleware/auth')
const { validationResult, check } = require('express-validator');
const router = express.Router();

const Profile = require('../../models/Profile')
const User = require('../../models/User')

//@route   GET api/profile/me
//@desc    Get current user's profile
//@access  Public

router.get('/me', auth, async (req, res) => {

    try {
        const profile = await Profile.findOne({ user: req.user.id }).populate('user', // req.user.id is retrieved from token
            ['name', 'avatar']);

        if (!profile) {
            return res.status(400).json({ msg: 'Profile does not exist for this user' })
        }

        res.json(profile);
    } catch (error) {
        console.log(error.message);
        return res.status(400).json('Internal Server Error');
    }

});

//@route   POST api/profile
//@desc    Create or Update user profile
//@access  Private

router.post('/',
    [auth,
        [
            check('status', 'Status is required').not().isEmpty(),
            check('skills', 'Skills is required').not().isEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            company,
            website,
            location,
            bio,
            status,
            githubusername,
            skills,
            youtube,
            linkedin,
            facebook,
            instagram,
            twitter
        } = req.body;

        // Creating Profile object
        const profileFields = {};
        profileFields.user = req.user.id; // ID is retrieved from the token sent.

        if (company) profileFields.company = company;
        if (website) profileFields.website = website;
        if (location) profileFields.location = location;
        if (bio) profileFields.bio = bio;
        if (status) profileFields.status = status;
        if (githubusername) profileFields.githubusername = githubusername;
        if (skills) {
            profileFields.skills = skills.split(',').map(skill => skill.trim());
        }
        // Creating social object
        profileFields.social = {};

        if (youtube) profileFields.social.youtube = youtube;
        if (facebook) profileFields.social.facebook = facebook;
        if (instagram) profileFields.social.instagram = instagram;
        if (twitter) profileFields.social.twitter = twitter;
        if (linkedin) profileFields.social.linkedin = linkedin;

        try {
            let profile = await Profile.findOne({ user: req.user.id });

            if (profile) {
                //UPDATE Profile
                profile = await Profile.findOneAndUpdate(
                    { user: req.user.id },
                    { $set: profileFields },
                    { new: true }
                );

                return res.json(profile);
            }

            //CREATE Profile
            profile = new Profile(profileFields);

            await profile.save();
            res.json(profile);

        } catch (error) {
            console.log(error.message);
            return res.status(500).send({ msg: 'Internal Server Error' });
        }
    });

//@route   GET api/profile/
//@desc    Get all profiles
//@access  Public

router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user',
            ['name', 'avatar']);
        res.json(profiles);
    } catch (err) {
        console.log(err.message);
        res.status(500).json('Internal Server Error');
    }
});

//@route   GET api/profile/user/:user_id
//@desc    Get profile by user ID
//@access  Public

router.get('/user/:user_id', async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.user_id }).populate('user',
            ['name', 'avatar']);

        if (!profile) return res.status(400).json({ msg: 'No Profile found' })

        res.json(profile);
    } catch (err) {
        console.log(err.message);

        if (err.kind == 'ObjectId')
            return res.status(400).json({ msg: 'No Profile Found' })
        res.status(500).json('Internal Server Error');
    }
});

//@route   DELETE api/profile
//@desc    Delete user, profile and posts
//@access  Private

router.delete('/', auth, async (req, res) => {

    try {
        await Profile.findOneAndDelete({ user: req.user.id }); // We can also use findOneAndRemove
        await User.findOneAndDelete({ _id: req.user.id });

        res.json({ msg: 'User succesfully deleted' })
    } catch (err) {
        console.log(err.message);
        res.status(500).send('Server Error');
    }

});

//@route   PUT api/profile/experience
//@desc    Add experience
//@access  Private

router.put('/experience',
    [auth,
        [
            check('title', 'Title is required').not().isEmpty(),
            check('company', 'Company is required').not().isEmpty(),
            check('from', 'From date is required').not().isEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            title,
            company,
            location,
            from,
            to,
            current,
            description
        } = req.body;

        const newExp = {
            title: title,
            company: company,
            location: location,
            from: from,
            to: to,
            current: current,
            description: description
        }

        try {
            const profile = await Profile.findOne({ user: req.user.id });
            profile.experience.unshift(newExp);

            await profile.save();

            res.json(profile);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }
    }

)

//@route   PUT api/profile/experience
//@desc    Update experience
//@access  Private

router.put('/experience/update/:exp_id',
    auth,
    async (req, res) => {

        const {
            title,
            company,
            location,
            from,
            to,
            current,
            description
        } = req.body;

        const newExp = {};
        newExp._id = req.params.exp_id;

        try {
            let profile = await Profile.findOne({ user: req.user.id });

            if (profile) {
                //UPDATE Experience
                profile = await Profile.findOneAndUpdate(
                    { user: req.user.id });

                const updateIndex = profile.experience.map(exp => exp._id).indexOf(req.params.exp_id);

                if (title) newExp.title = title;
                else newExp.title = profile.experience[updateIndex];

                if (company) newExp.company = company;
                else newExp.company = profile.experience[updateIndex].company;

                if (location) newExp.location = location;
                else newExp.location = profile.experience[updateIndex].location;

                if (from) newExp.from = from;
                else newExp.from = profile.experience[updateIndex].from;

                if (to) newExp.to = to;
                else newExp.to = profile.experience[updateIndex].to;

                if (current) newExp.current = current;
                else newExp.current = profile.experience[updateIndex].current;

                if (description) newExp.description = description;
                else newExp.description = profile.experience[updateIndex].description;


                profile.experience[updateIndex] = newExp;
                console.log('Experience updated!')

                await profile.save();
            }

            res.json(profile);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }


    }
)

//@route   DELETE api/profile/experience/exp_id
//@desc    Delete experience
//@access  Private

router.delete('/experience/:exp_id',
    auth,
    async (req, res) => {
        try {
            const profile = await Profile.findOne({ user: req.user.id });

            const targetIndex = profile.experience.map(exp => exp.id).indexOf(req.params.exp_id);
            profile.experience.splice(targetIndex, 1);

            await profile.save();
            res.json(profile);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }
    })

//@route   PUT api/profile/education
//@desc    Add education
//@access  Private

router.put('/education',
    [auth,
        [
            check('school', 'School is required').not().isEmpty(),
            check('degree', 'Degree is required').not().isEmpty(),
            check('fieldofstudy', 'Fieldofstudy is required').not().isEmpty(),
            check('from', 'From date is required').not().isEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            school,
            degree,
            fieldofstudy,
            from,
            to,
            current,
            description
        } = req.body;

        const newExp = {
            school: school,
            degree: degree,
            fieldofstudy: fieldofstudy,
            from: from,
            to: to,
            current: current,
            description: description
        }

        try {
            const profile = await Profile.findOne({ user: req.user.id });
            profile.education.unshift(newExp);

            await profile.save();

            res.json(profile);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }
    }

)

//@route   DELETE api/profile/education/edu_id
//@desc    Delete education
//@access  Private

router.delete('/education/:edu_id',
    auth,
    async (req, res) => {
        try {
            const profile = await Profile.findOne({ user: req.user.id });

            const targetIndex = profile.education.map(edu => edu.id).indexOf(req.params.edu_id);
            profile.education.splice(targetIndex, 1);

            await profile.save();
            res.json(profile);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }
    });

//@route   GET api/profile/github/:username
//@desc    Get user's github repos
//@access  Public

router.get('/github/:username', async (req, res) => {
    try {
        // const options = {
        //     uri: `https://api.github.com/users/${req.params.username}/repos/per_page=5&sort=created:asc&
        //           client_id=${config.get('githubClientId')}&client_secret=${config.get('githubClientSecret')}`,
        //     method: "GET",
        //     headers: { 'user-agent': 'node.js' }
        // };

        // request(options, (error, response, body) => {
        //     if (error) console.error(error);

        //     if (response.statusCode !== 200)
        //         res.status(404).json({ msg: "No user found" })

        //     res.json(JSON.parse(body));
        // })

        const uri = encodeURI(
            `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
        );
        const headers = {
            'user-agent': 'node.js',
            Authorization: `token ${config.get('githubToken')}`
        };

        const gitHubResponse = await axios.get(uri, { headers });
        return res.json(gitHubResponse.data);
    } catch (err) {
        console.error(err.message);
        return res.status(404).json({ msg: 'No Github profile found' });
    }

})

module.exports = router;