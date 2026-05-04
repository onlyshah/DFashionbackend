const mongoose = require('mongoose');
const  billsendonEmail = mongoose.Schema({
     name: {type:String, require:true},
     billpdf:{type:String, require:true},
     message:{type:String},
     email:{type:String},
     userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      paymentType:{type: Object,require:true}
   
});



module.exports = mongoose.model('Email',billsendonEmail)