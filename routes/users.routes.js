// routes/fido.routes.js
const express = require('express');
const router = express.Router();
const fido2Controller = require('../controllers/fido2.controller');


// Registration Routes
router.post('/register',
    fido2Controller.register
);

router.post('/register/begin',
    fido2Controller.startFidoRegistration
);

router.post('/register/complete',
    fido2Controller.completeFidoRegistration
);


router.post('/login/begin',
    fido2Controller.loginBegin
);

router.post('/login/complete',
    fido2Controller.loginComplete
);

module.exports = router;
