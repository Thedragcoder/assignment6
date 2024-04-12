const unCountryData = require("./modules/unCountries");
const authData = require("./modules/auth-service");
const express = require('express');
const clientSessions = require('client-sessions');
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');

app.use(clientSessions({
    cookieName: 'session',
    secret: 'E2iTGlW6ZTCA3uVW9fjKT9EwwkzO9Hqu',
    duration: 2 * 60 * 1000,
    activeDuration: 1000 * 60,
}));

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        next();
    }
}

// Routes for handling UN Country operations
app.post("/un/addCountry", ensureLogin, async (req, res) => {
    try {
        await unCountryData.addCountry(req.body);
        res.redirect("/un/countries");
    } catch (err) {
        res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
    }
});

app.post("/un/editCountry", ensureLogin, async (req, res) => {
    try {
        await unCountryData.editCountry(req.body.a2code, req.body);
        res.redirect("/un/countries");
    } catch (err) {
        res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
    }
});

app.get("/un/deleteCountry/:code", ensureLogin, async (req, res) => {
    try {
        await unCountryData.deleteCountry(req.params.code);
        res.redirect("/un/countries");
    } catch (err) {
        res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
    }
});

// New Routes
app.get('/login', (req, res) => {
    res.render('login', { message: '' });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        await authData.registerUser(req.body);
        res.render('register', { successMessage: 'User created' });
    } catch (err) {
        res.render('register', { errorMessage: err, userName: req.body.userName });
    }
});

app.post('/login', async (req, res) => {
    req.body.userAgent = req.get('User-Agent');
    try {
        const user = await authData.checkUser(req.body);
        req.session.user = {
            userName: user.userName,
            email: user.email,
            loginHistory: user.loginHistory
        };
        res.redirect('/un/countries');
    } catch (err) {
        res.render('login', { errorMessage: err, userName: req.body.userName });
    }
});

app.get('/logout', (req, res) => {
    req.session.reset();
    res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
    res.render('userHistory');
});

// Existing routes...

app.get('/', (req, res) => {
    res.render("home");
});

app.get('/about', (req, res) => {
    res.render("about");
});

app.get('/dashboard', ensureLogin, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

unCountryData.initialize()
.then(authData.initialize)
.then(() => {
    app.listen(HTTP_PORT, () => {
        console.log(`Server listening on: ${HTTP_PORT}`);
    });
})
.catch(err => {
    console.log(`Unable to start server: ${err}`);
});
