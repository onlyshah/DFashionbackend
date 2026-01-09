module.exports = (sequelize, DataTypes) => {
  return sequelize.define('KYCDocument', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    documentType: { type: DataTypes.ENUM('aadhar', 'pan', 'passport', 'driving_license', 'gst'), defaultValue: 'aadhar' },
    documentNumber: { type: DataTypes.STRING(100), unique: true },
    documentFile: { type: DataTypes.STRING(500) },
    status: { type: DataTypes.ENUM('pending', 'verified', 'rejected', 'expired'), defaultValue: 'pending' },
    verifiedAt: { type: DataTypes.DATE },
    expiryDate: { type: DataTypes.DATE }
  }, { tableName: 'kyc_documents', timestamps: true });
};
