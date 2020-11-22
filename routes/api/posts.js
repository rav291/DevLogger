const express = require('express');
const router = express.Router();

const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const User = require('../../models/User');
const Profile = require('../../models/Profile');
const Post = require('../../models/Post');

//@route   POST api/posts
//@desc    Add a post
//@access  Private

router.post('/',
    [auth,
        check('text', 'Text is mandatory').not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const user = await User.findById(req.user.id).select('-password'); // req.user.id is the jwt payload 

            const newPost = new Post({
                text: req.body.text,
                user: req.user.id,
                name: user.name,
                avatar: user.avatar
            });

            const post = await newPost.save();

            res.json(post);
        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }

    });

//@route   GET api/posts
//@desc    Get all posts
//@access  Private

router.get('/', auth,
    async (req, res) => {
        try {
            const posts = await Post.find().sort({ date: -1 }) // -1 for recent first.
            res.json(posts);
        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error')
        }
    });

//@route   GET api/posts/:id
//@desc    Get Post by ID
//@access  Private

router.get('/:id', auth,
    async (req, res) => {
        try {
            const post = await Post.findById(req.params.id); // -1 for recent first.

            if (!post) return res.status(404).json({ msg: 'Post not found' });

            res.json(post);
        } catch (error) {
            console.log(error.message);

            if (error.kind === 'ObjectId') return res.status(404).json({ msg: 'Post not found' });

            res.status(500).send('Internal Server Error')
        }
    });

//@route   DELETE api/posts/:id
//@desc    Delete all posts
//@access  Private

router.delete('/:id', auth,
    async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);

            if (!post) return res.status(404).json({ msg: 'Post not found' });

            if (post.user.toString() !== req.user.id) {
                return res.status(401).send({ msg: 'User not authorized' });
            }

            await post.remove();
            res.json({ msg: 'Post successfully deleted' });
        } catch (error) {

            console.log(error.message);
            if (error.kind === 'ObjectId') return res.status(404).json({ msg: 'Post not found' });
            res.status(500).send('Internal Server Error')
        }
    });

//@route   GET api/posts/like/:id
//@desc    Like Post by ID
//@access  Private

router.put('/like/:id', auth,
    async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);

            // Checking if the post is liked or not
            if (post.likes.filter(like => like.user.toString() === req.user.id).length > 0)
                return res.status(400).json({ msg: 'Post cannot be liked twice' });

            post.likes.unshift({ user: req.user.id });

            await post.save();

            res.json(post.likes);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }
    });

//@route   GET api/posts/like/:id
//@desc    Like Post by ID
//@access  Private

router.put('/unlike/:id', auth,
    async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);

            // Checking if the post is liked or not
            if (post.likes.filter(like => like.user.toString() === req.user.id).length == 0)
                return res.status(400).json({ msg: 'Post cannot be unliked' });

            const removeIndex = post.likes.map(like => like.user).indexOf(req.user.id);

            post.likes.splice(removeIndex, 1);

            await post.save();

            res.json(post.likes);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }
    });

//@route   POST api/posts/comment/:id
//@desc    Add a comment
//@access  Private

router.post('/comment/:id',
    [auth,
        check('text', 'Text is mandatory').not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const user = await User.findById(req.user.id).select('-password');

            const post = await Post.findById(req.params.id);

            const newComment = {
                text: req.body.text,
                user: req.user.id,
                name: user.name,
                avatar: user.avatar
            };

            post.comments.unshift(newComment);

            await post.save();
            res.json(post.comments);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }

    });

//@route   POST api/posts/comment/:id/:comment_id
//@desc    Update a comment
//@access  Private

router.post('/comment/:id/:comment_id',
    [auth,
        check('text', 'Text is mandatory').not().isEmpty()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

        try {
            const user = await User.findById(req.user.id).select('-password');
            const post = await Post.findById(req.params.id);
            const comment = post.comments.find(comment => comment.id === req.params.comment_id);

            if (comment.user.toString() !== req.user.id) {
                return res.status(401).json({ msg: 'Access Denied' })
            }

            const newComment = {
                text: req.body.text,
                user: req.user.id,
                name: user.name,
                avatar: user.avatar
            };

            const updateIndex = post.comments.map(comment => comment.id).indexOf(req.params.comment_id);

            post.comments[updateIndex] = newComment;

            await post.save();
            res.json(post.comments);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }

    });

//@route   DELETE api/posts/comment/:id/:comment_id
//@desc    Delete a comment
//@access  Private

router.delete('/comment/:id/:comment_id', auth,
    async (req, res) => {
        try {
            const post = await Post.findById(req.params.id);

            const comment = post.comments.find(comment => comment.id === req.params.comment_id);

            if (!comment) {
                return res.status(404).json({ msg: 'Comment not found' });
            }

            if (comment.user.toString() !== req.user.id) {
                return res.status(401).json({ msg: 'Access Denied' })
            }

            const removeIndex = post.comments.map(comment => comment.user).indexOf(req.user.id);

            post.comments.splice(removeIndex, 1);

            await post.save();

            res.json(post.comments);

        } catch (error) {
            console.log(error.message);
            res.status(500).send('Internal Server Error');
        }
    })


module.exports = router;