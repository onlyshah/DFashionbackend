const express = require('express');
const router = express.Router();
const email = require('../controller/sendEmail')
const multer = require('multer');
// File filter function
const storages  = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/bill');
    },
    filename: function (req, file, cb) {
        const date = new Date();
        cb(null, ('billpdf'+date.getUTCFullYear()+'-'+ date.getUTCMonth()+'-'+ date.getDate()+'-' +file.originalname).toString())
      }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true); // Accept PDF files
    } else {
        cb(new Error('File type not supported'), false);
    }
};
// Multer upload configuration
const upload = multer({
    storage: storages,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 10} // 5 MB file size limit
});

//Route to handle file upload and sending email
// const upload = multer({ dest: 'uploads/' }); // specify your desired upload directory
router.post('/email', upload.single('billpdf'), email.sendMail);
router.post('/forgotpassword', email.forgetpasswordsendemail);
router.post('/create-order', email.createOrder);

module.exports = router;
