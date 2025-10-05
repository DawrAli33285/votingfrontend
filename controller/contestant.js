const {cloudinaryUploadImage}=require('../middlewares/cloudinary')
const fs=require('fs')
const jwt=require('jsonwebtoken');
const contenstantModel = require('../models/contenstant');


function generatePassword(length = 12) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
    let password = "";
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
  
    return password;
  }
module.exports.registerContestant = async (req, res) => {
    const stripe = require('stripe')("sk_test_51OwuO4LcfLzcwwOYsXYljgE1gUyGnLFvjewSf1NG9CsrSqTsxm7n7ppmZ2ZIFL01ptVDhuW7LixPggik41wWmOyE00RjWnYxUA"); 
    const { paymentMethod, ...data } = req.body; 

    try {
        let alreadyExists=await contenstantModel.findOne({email:data.email})
        if(alreadyExists){
            return res.status(400).json({
                error:"Contestant already exists"
            })
        }

        if (req.file) {
            console.log('File received:', req.file.path);
            
            const cloudinaryResult = await cloudinaryUploadImage(req.file.path);
            
            if (cloudinaryResult.url) {
                data.video = cloudinaryResult.url;
                console.log('Image uploaded to Cloudinary:', cloudinaryResult.url);
                
                fs.unlinkSync(req.file.path);
            } else {
                throw new Error('Failed to upload image to Cloudinary');
            }
        }

       
        let customerId;
        const existingPaymentMethod = await stripe.paymentMethods.retrieve(paymentMethod);
        
        if (existingPaymentMethod.customer) {
            
            customerId = existingPaymentMethod.customer;
            console.log('Using existing customer:', customerId);
        } else {
          
            const customer = await stripe.customers.create({
                name: data.name,
                email: data.email,
            });
            customerId = customer.id;
            
          
            await stripe.paymentMethods.attach(paymentMethod, {
                customer: customerId,
            });
            
           
            await stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethod,
                },
            });
            console.log('Created new customer:', customerId);
        }

        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 5000, 
            currency: 'usd',
            customer: customerId,
            payment_method: paymentMethod,
            confirm: true, 
            return_url: 'https://yourwebsite.com/success',
            metadata: {
                contestant_name: data.name,
                contestant_email: data.email
            }
        });

        console.log('PaymentIntent status:', paymentIntent.status);

       
        if (paymentIntent.status === 'succeeded') {
          
          
            data.code=generatePassword(12);
         let contenstant=await contenstantModel.create(data);
            
            return res.status(200).json({
                success: true,
                message: 'Registration successful',
                contestantCode: data.code,
                paymentStatus: paymentIntent.status,
                contenstant
            
            });
        } else {
            throw new Error(`Payment failed with status: ${paymentIntent.status}`);
        }

    } catch (error) {
        console.log('Error:', error.message);
        return res.status(400).json({
            success: false,
            error: error.message || "Error occurred while registering contestant"
        });
    }
}

module.exports.login = async (req, res) => {
    const { email, code } = req.body;
  
    console.log('Login attempt - Email:', email, 'Code:', code);
    
    try {
      const contestant = await contenstantModel.findOne({ email });
  
      if (!contestant) {
        return res.status(400).json({ error: "Email is invalid" });
      }
  
      console.log('Found contestant:', contestant);
      
     
      const inputCode = code.toLowerCase().trim();
      const storedCode = contestant.code.toLowerCase().trim();
    
      console.log('Comparing codes - Input:', inputCode, 'Stored:', storedCode);
      
      if (storedCode !== inputCode) {
        return res.status(400).json({ error: "Code is invalid" });
      }
  
      return res.status(200).json({
        contestant,
        message: "Logged in successfully",
      });
    } catch (e) {
      console.log('Login error:', e.message);
      return res.status(400).json({
        error: "Error occurred while trying to login",
      });
    }
};

module.exports.resetCode = async (req, res) => {
    const { email } = req.body;
  
  
    try {
      const contestant = await contenstantModel.findOne({ email });
  
      if (!contestant) {
        return res.status(400).json({ error: "Email is invalid" });
      }
  
      console.log('Found contestant:', contestant);
      
     let code=generatePassword(12);

     await contenstantModel.updateOne({email},{
        $set:{
            code
        }
     })
     
      return res.status(200).json({
        message: "Code changed sucessfully",
        code
      });
    } catch (e) {
      console.log('Login error:', e.message);
      return res.status(400).json({
        error: "Error occurred while trying to login",
      });
    }
};

module.exports.vote = async (req, res) => {
    const stripe = require('stripe')("sk_test_51OwuO4LcfLzcwwOYsXYljgE1gUyGnLFvjewSf1NG9CsrSqTsxm7n7ppmZ2ZIFL01ptVDhuW7LixPggik41wWmOyE00RjWnYxUA");
    let { code, paymentMethod } = req.body;
    code=code.toLowerCase();
    try {
       
        let validCode = await contenstantModel.findOne({ code });
        if (!validCode) {
            return res.status(400).json({
                error: "Invalid contestant code"
            });
        }

       
        let customerId;
        const existingPaymentMethod = await stripe.paymentMethods.retrieve(paymentMethod);
        
        if (existingPaymentMethod.customer) {
           
            customerId = existingPaymentMethod.customer;
            console.log('Using existing customer for vote:', customerId);
        } else {
           
            const customer = await stripe.customers.create();
            customerId = customer.id;
            
         
            await stripe.paymentMethods.attach(paymentMethod, {
                customer: customerId,
            });
            
        
            await stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethod,
                },
            });
            console.log('Created new customer for vote:', customerId);
        }

       
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 1000,
            currency: 'usd',
            customer: customerId,
            payment_method: paymentMethod,
            confirm: true,
            return_url: 'https://yourwebsite.com/success',
            metadata: {
                contestant_code: code,
                contestant_name: validCode.name,
                vote_type: 'contest_vote'
            }
        });

        console.log('Vote PaymentIntent status:', paymentIntent.status);

       
        if (paymentIntent.status === 'succeeded') {
           
            await contenstantModel.updateOne({ code }, {
                $inc: {
                    totalVotes: 1
                }
            });

           
            const updatedContestant = await contenstantModel.findOne({ code });

            return res.status(200).json({
                success: true,
                message: `Vote submitted successfully for ${validCode.name}`,
                contestantName: validCode.name,
                newVoteCount: updatedContestant.totalVotes,
                paymentStatus: paymentIntent.status,
                amount: 10.00
            });
        } else if (paymentIntent.status === 'requires_action') {
           
            return res.status(200).json({
                success: true,
                requiresAction: true,
                clientSecret: paymentIntent.client_secret,
                message: "Additional authentication required"
            });
        } else {
            throw new Error(`Payment failed with status: ${paymentIntent.status}`);
        }

    } catch (error) {
        console.log('Vote Error:', error.message);
        
       
        if (error.type === 'StripeCardError') {
            return res.status(400).json({
                success: false,
                error: "Your card was declined. Please try a different payment method."
            });
        } else if (error.type === 'StripeRateLimitError') {
            return res.status(400).json({
                success: false,
                error: "Too many requests. Please try again later."
            });
        } else if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({
                success: false,
                error: "Invalid payment information. Please check your card details."
            });
        } else if (error.type === 'StripeAPIError') {
            return res.status(400).json({
                success: false,
                error: "Payment service temporarily unavailable. Please try again."
            });
        } else if (error.type === 'StripeConnectionError') {
            return res.status(400).json({
                success: false,
                error: "Network error. Please check your connection and try again."
            });
        } else if (error.type === 'StripeAuthenticationError') {
            return res.status(400).json({
                success: false,
                error: "Payment authentication failed. Please try again."
            });
        }
        
        return res.status(400).json({
            success: false,
            error: error.message || "Error occurred while processing vote"
        });
    }
}




module.exports.ContestantData = async (req, res) => {
    let {email}=req.body
    try {
        let contestant = await contenstantModel.findOne({email})
      
        return res.status(200).json({
            success: true,
            contestants: contestant
        })
    } catch (e) {
        console.log(e.message)
        return res.status(400).json({
            error: "Error occurred while fetching contestant data"
        })
    }
}


module.exports.getContestantData = async (req, res) => {
    try {
        let contestants = await contenstantModel.find({})
        console.log(contestants)
        return res.status(200).json({
            success: true,
            contestants: contestants
        })
    } catch (e) {
        console.log(e.message)
        return res.status(400).json({
            error: "Error occurred while fetching contestant data"
        })
    }
}