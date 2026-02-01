// Sellers Seeder Script
// Creates vendor records with KYC documents, commission data, and performance metrics
// Usage: node scripts/sellers.seeder.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const KYCDocument = require('../models/KYCDocument');
const SellerCommission = require('../models/SellerCommission');
const SellerPerformance = require('../models/SellerPerformance');
const bcrypt = require('bcryptjs');

const DB_MODE = (process.env.DB_MODE || 'postgres').toLowerCase().trim();
if (DB_MODE !== 'mongo' && DB_MODE !== 'both') {
  console.log('⏭️  Skipping sellers.seeder - MongoDB disabled (DB_MODE=' + DB_MODE + ')');
  process.exit(0);
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dfashion';

async function seedSellers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for sellers seeding');

    // Get admin user for approval
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      throw new Error('No admin user found for seller approval');
    }

    // Clear existing seller data
    await User.deleteMany({ role: 'vendor' });
    await KYCDocument.deleteMany({});
    await SellerCommission.deleteMany({});
    await SellerPerformance.deleteMany({});

    const sellerTypes = ['individual', 'business'];
    const categories = ['Fashion', 'Electronics', 'Home & Living', 'Beauty', 'Sports'];
    const commissionRates = [8, 10, 12, 15, 18];

    const sellers = [];
    const kycDocuments = [];
    const commissions = [];
    const performances = [];

    // Create 10 sellers
    for (let i = 0; i < 10; i++) {
      const sellerId = new mongoose.Types.ObjectId();
      const sellerType = sellerTypes[i % sellerTypes.length];
      const primaryCategory = categories[i % categories.length];
      const commissionRate = commissionRates[i % commissionRates.length];
      const isApproved = i < 8; // First 8 approved, last 2 pending

      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Seller123!', salt);

      // Create seller user
      const seller = {
        _id: sellerId,
        username: `seller${i + 1}`,
        email: `seller${i + 1}@dfashion.com`,
        password: hashedPassword,
        fullName: sellerType === 'individual' ? `Individual Seller ${i + 1}` : `${['Fashions Inc', 'Style Co', 'Trends Ltd', 'Elegance Retail', 'Premium Wear'][i % 5]}`,
        phone: `98${String(i + 1).padStart(8, '0')}00${i + 1}`,
        role: 'vendor',
        avatar: `/uploads/avatars/seller${i + 1}.svg`,
        isActive: true,
        department: 'vendor_management',
        sellerInfo: {
          businessType: sellerType,
          businessName: sellerType === 'business' ? `Business ${i + 1}` : null,
          businessRegistration: sellerType === 'business' ? `REG${String(i + 1).padStart(6, '0')}` : null,
          primaryCategory: primaryCategory,
          categories: [primaryCategory, categories[(i + 1) % categories.length]],
          commissionRate: commissionRate,
          bankAccountDetails: {
            accountHolderName: sellerType === 'individual' ? `Seller ${i + 1}` : `Business ${i + 1}`,
            accountNumber: `ACC${String(i + 1).padStart(10, '0')}`,
            ifscCode: 'HDFC0001234',
            bankName: 'HDFC Bank'
          },
          isApproved: isApproved,
          approvalStatus: isApproved ? 'approved' : 'pending_review',
          approvalDate: isApproved ? new Date(Date.now() - 30*24*60*60*1000) : null,
          approvedBy: isApproved ? admin._id : null,
          rejectionReason: null
        },
        createdAt: new Date(Date.now() - 60*24*60*60*1000),
        updatedAt: new Date()
      };

      sellers.push(seller);

      // Create KYC documents
      const documentTypes = sellerType === 'individual' 
        ? ['aadhar', 'pan', 'bank_account']
        : ['gst_certificate', 'pan', 'bank_account', 'business_license'];

      documentTypes.forEach((docType, docIndex) => {
        const docApprovalStates = ['approved', 'pending', 'rejected'];
        const docApprovalState = docApprovalStates[Math.floor(Math.random() * (isApproved ? 1 : 3))];

        const kycDoc = {
          seller: sellerId,
          documentType: docType,
          documentNumber: `DOC${Date.now()}${docIndex}`,
          documentFile: `/uploads/kyc/${sellerId}/doc_${docIndex}.pdf`,
          frontImageUrl: `/uploads/kyc/${sellerId}/front_${docIndex}.jpg`,
          backImageUrl: docType !== 'gst_certificate' && docType !== 'business_license' ? `/uploads/kyc/${sellerId}/back_${docIndex}.jpg` : null,
          issueDate: new Date(Date.now() - 365*24*60*60*1000),
          expiryDate: new Date(Date.now() + 365*24*60*60*1000),
          issuingCountry: 'IN',
          approvalStatus: docApprovalState,
          approvalDate: docApprovalState === 'approved' ? new Date(Date.now() - 25*24*60*60*1000) : null,
          approvedBy: docApprovalState === 'approved' ? admin._id : null,
          rejectionReason: docApprovalState === 'rejected' ? 'Document quality not sufficient' : null,
          resubmissionAttempts: docApprovalState === 'rejected' ? 1 : 0,
          createdAt: new Date(Date.now() - 35*24*60*60*1000),
          updatedAt: new Date()
        };

        kycDocuments.push(kycDoc);
      });

      // Create commission record
      const commission = {
        seller: sellerId,
        rate: commissionRate,
        applicableCategories: [primaryCategory],
        startDate: new Date(Date.now() - 60*24*60*60*1000),
        endDate: null,
        totalEarnings: i < 8 ? Math.floor(Math.random() * 500000) + 10000 : 0,
        totalPaid: i < 8 ? Math.floor(Math.random() * 450000) : 0,
        pendingAmount: i < 8 ? Math.floor(Math.random() * 50000) : 0,
        lastPayoutDate: i < 8 ? new Date(Date.now() - 7*24*60*60*1000) : null,
        nextPayoutDate: i < 8 ? new Date(Date.now() + 23*24*60*60*1000) : null,
        payoutFrequency: 'monthly',
        minimumPayoutThreshold: 1000,
        createdAt: new Date(Date.now() - 60*24*60*60*1000),
        updatedAt: new Date()
      };

      commissions.push(commission);

      // Create performance metrics
      if (i < 8) { // Only for approved sellers
        const performance = {
          seller: sellerId,
          totalOrdersValue: Math.floor(Math.random() * 5000000) + 100000,
          totalOrders: Math.floor(Math.random() * 500) + 10,
          totalProductsSold: Math.floor(Math.random() * 2000) + 50,
          averageRating: (Math.random() * 2 + 3.5).toFixed(1), // 3.5 to 5.5
          totalReviews: Math.floor(Math.random() * 200) + 10,
          returnRate: (Math.random() * 5).toFixed(2), // 0 to 5%
          cancellationRate: (Math.random() * 3).toFixed(2), // 0 to 3%
          onTimeDeliveryRate: (Math.random() * 10 + 85).toFixed(2), // 85 to 95%
          customerSatisfactionScore: (Math.random() * 20 + 75).toFixed(1), // 75 to 95%
          lastUpdated: new Date(),
          performanceTier: Math.random() > 0.5 ? 'gold' : 'silver',
          createdAt: new Date(Date.now() - 60*24*60*60*1000)
        };

        performances.push(performance);
      }
    }

    await User.insertMany(sellers);
    await KYCDocument.insertMany(kycDocuments);
    await SellerCommission.insertMany(commissions);
    await SellerPerformance.insertMany(performances);

    console.log(`✓ ${sellers.length} sellers seeded successfully`);
    console.log(`✓ ${kycDocuments.length} KYC documents created`);
    console.log(`✓ ${commissions.length} commission records created`);
    console.log(`✓ ${performances.length} performance metrics created`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Sellers seeding failed:', err.message);
    process.exit(1);
  }
}

seedSellers();
