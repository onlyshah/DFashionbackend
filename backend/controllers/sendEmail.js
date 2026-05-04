const nodemailer = require('nodemailer');
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../models/user')
const billemail = require('../models/Email'); // Update the path as necessary
const crypto = require('crypto');
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: 'rzp_test_MiheZxloav4xYh',
  key_secret: 'wrGf5uDOQ2Adrxn0qoaAI9oc'
});

exports.sendMail = async (req, res) => {
  try {
     console.log("body", req.body);
    // console.log("file", req.file);
    let email = req.body.email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found');
    }
    if (!req.file) {
      return res.status(400).send('No file uploaded');
    }

    const emailBill = new billemail({ 
      _id: new mongoose.Types.ObjectId(),
      userId: req.body.userId,
      name: req.body.name,
      email: req.body.email,
      message: req.body.message,
      billpdf: req.file.path,
      
    });
    console.log("emailBill",emailBill)

    const result = await emailBill.save();
    console.log(result);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'shahnikunjsbit@gmail.com', // Replace with your email address
        pass: 'umkl llnz kgkp nmpj' // Replace with your email password
      }
    });

    const mailOptions = {
      from: 'shahnikunjsbit@gmail.com',
      to: req.body.email, // Replace with recipient email address
      subject: 'Bill Of Your Order',
      text: `Name: ${req.body.name}\nEmail: ${req.body.email}\nMessage: ${req.body.message}`,
      attachments: [
        {
          filename: req.file.originalname,
          path: req.file.path
        }
      ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send('Error sending email');
      } else {
        console.log('Email sent:', info.response);
        // Delete the file after sending the email
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error('Error deleting file:', err);
          }
        });
        return res.status(200).send('Email sent successfully');
      }
    });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).send('Internal Server Error');
  }
};

exports.forgetpasswordsendemail = async (req, res) => {
  try {
    email  = req.body.email;
    console.log("email", req.body.email);
  
  //Find the user by email
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).send('User not found');
  }

  // Generate a reset token
  const token = crypto.randomBytes(32).toString('hex');
 // email = crypto.randomBytes(32).toString('hex')
   email = Buffer.from(email).toString('base64'); 
  
  // Set token and expiration on user object
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
  //Save the user object
  await user.save()
  // Create a reset link
   const resetLink = `https://onlyshah.github.io/shoppingbuzz/reset-password/${token}+${email}`;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'shahnikunjsbit@gmail.com', // Replace with your email address
        pass: 'umkl llnz kgkp nmpj' // Replace with your email password
      }
    });

    const mailOptions = {
     from: 'shahnikunjsbit@gmail.com',
      to: req.body.email, // Replace with recipient email address
    subject: 'Password Reset',
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
           Please click on the following link, or paste this into your browser to complete the process:\n\n
           ${resetLink}\n\n
           If you did not request this, please ignore this email and your password will remain unchanged.\n`

    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
        return res.status(500).json({
          message: "Error sending email. Please contact support team."
        });
      } else {
        console.log('Email sent:', info.response);
        // Delete the file after sending the email
        // fs.unlink(req.file.path, (err) => {
        //   if (err) {
        //     console.error('Error deleting file:', err);
        //   }
        // });
        return res.status(200).json({
          message: "Email sent. Please check your inbox or spam folder."
        });
      }
    });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).send('Internal Server Error');
  }
};
exports.createOrder = async (req, res) => {
  console.log(req.body)
  try {
    const options = {
      amount: req.body.amount, // amount in the smallest currency unit
      currency: "INR",
      receipt: crypto.randomBytes(10).toString('hex'),
    };
    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).send("Some error occured");
    res.status(200).send(order);
  } catch (error) {
    res.status(500).send(error);
  }
};
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const hmac = crypto.createHmac('sha256', razorpay.key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');
    if (generatedSignature === razorpay_signature) {
      res.status(200).send("Payment verified successfully");
    } else {
      res.status(400).send("Invalid signature");
    }
  } catch (error) {
    res.status(500).send(error);
  }
};